"""The AI model: gradient-boosted trees predicting "take-profit is hit before stop-loss".

Training protocol (built to avoid fooling ourselves):
  * Samples from all symbols are pooled and ordered by time.
  * Purged walk-forward validation: every fold trains only on the past, a gap of `horizon` bars
    separates train/validation/test so labels never leak across the boundary.
  * Probabilities are calibrated (Platt scaling) on a held-out validation slice, and the trading
    threshold is chosen there to maximise expectancy — never on the test slice.
  * Reported win rate / expectancy are the averages of the out-of-sample test folds.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass, field

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

from .config import BotConfig, settings
from .features import CONTEXT_SYMBOL, FEATURES, build_features, market_context, triple_barrier_labels
from .experts import expert_scores, regime_series, rule_score
from .indicators import add_indicators
from .strategy import entry_filters

log = logging.getLogger(__name__)
MODEL_DIR = settings.data_dir / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "model.joblib"
META_PATH = MODEL_DIR / "model.json"
THRESHOLDS = np.round(np.arange(0.50, 0.86, 0.01), 2)

FEATURE_LABELS = {
    "ret_1": "Getiri (1 mum)", "ret_3": "Getiri (3 mum)", "ret_6": "Getiri (6 mum)", "ret_12": "Getiri (12 mum)",
    "ret_24": "Getiri (24 mum)", "ret_48": "Getiri (48 mum)", "rsi": "RSI 14", "rsi7": "RSI 7", "rsi_delta": "RSI değişimi",
    "stoch_k": "Stoch RSI %K", "stoch_d": "Stoch RSI %D", "mfi": "MFI", "cci_n": "CCI", "macd_n": "MACD",
    "macd_hist_n": "MACD histogram", "macd_hist_delta": "MACD hist. değişimi", "bb_pctb": "Bollinger %B",
    "bb_width": "Bollinger genişliği", "bb_width_chg": "Bollinger genişlik değişimi", "atr_pct": "ATR %",
    "atr_pct_rank": "ATR yüzdelik sırası", "vol_ratio_atr": "Volatilite oranı", "adx": "ADX", "di_diff": "+DI − −DI",
    "d_ema9": "EMA9 uzaklığı", "d_ema20": "EMA20 uzaklığı", "d_ema50": "EMA50 uzaklığı", "d_ema200": "EMA200 uzaklığı",
    "ema20_50": "EMA20−EMA50", "ema50_200": "EMA50−EMA200", "ema50_slope": "EMA50 eğimi", "ema200_slope": "EMA200 eğimi",
    "st_dir": "Supertrend yönü", "st_dist": "Supertrend uzaklığı", "dc_pos": "Donchian konumu", "vwap_dist": "VWAP uzaklığı",
    "vol_z": "Hacim z-skoru", "vol_ratio": "Hacim oranı", "obv_slope": "OBV eğimi", "body": "Mum gövdesi",
    "upper_wick": "Üst fitil", "lower_wick": "Alt fitil", "range_pos_50": "50 mum aralık konumu",
    "dist_high_100": "100 mum zirvesine uzaklık", "dist_low_100": "100 mum dibine uzaklık",
    "hour_sin": "Saat (sin)", "hour_cos": "Saat (cos)", "ret_96": "Getiri (96 mum)", "ret_192": "Getiri (192 mum)",
    "x_trend": "Uzman: Trend", "x_momentum": "Uzman: Momentum", "x_mean_reversion": "Uzman: Ortalamaya dönüş",
    "x_breakout": "Uzman: Kırılım", "x_volume": "Uzman: Hacim", "x_supertrend": "Uzman: Supertrend",
    "x_rule": "Kural skoru", "x_regime_up": "Rejim: yükseliş", "x_regime_down": "Rejim: düşüş", "x_regime_range": "Rejim: yatay",
    "btc_ret_6": "BTC getirisi (6)", "btc_ret_24": "BTC getirisi (24)", "btc_ret_96": "BTC getirisi (96)",
    "btc_d_ema200": "BTC EMA200 uzaklığı", "btc_ema50_slope": "BTC EMA50 eğimi", "btc_st_dir": "BTC Supertrend",
    "btc_adx": "BTC ADX", "rel_ret_24": "BTC'ye göre güç (24)", "rel_ret_96": "BTC'ye göre güç (96)",
}


class PlattCalibrator:
    """Logistic calibration on the logit of the raw score. Smooth and monotonic, so unlike
    isotonic regression it does not produce 0%/100% plateaus on small calibration sets."""

    def __init__(self) -> None:
        self.lr = LogisticRegression(C=1.0)

    @staticmethod
    def _x(raw: np.ndarray) -> np.ndarray:
        p = np.clip(np.asarray(raw, float), 1e-4, 1 - 1e-4)
        return np.log(p / (1 - p)).reshape(-1, 1)

    def fit(self, raw: np.ndarray, y: np.ndarray) -> "PlattCalibrator":
        self.lr.fit(self._x(raw), np.asarray(y, int))
        return self

    def predict(self, raw: np.ndarray) -> np.ndarray:
        return self.lr.predict_proba(self._x(raw))[:, 1]


def _new_classifier() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        learning_rate=0.04,
        max_iter=400,
        max_leaf_nodes=15,
        max_depth=5,
        min_samples_leaf=80,
        l2_regularization=1.0,
        max_features=0.7,
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=30,
        random_state=42,
    )


NO_TRADE_THRESHOLD = 1.01  # used when validation shows no positive expectancy at any threshold


def _choose_threshold(p: np.ndarray, y: np.ndarray, r: np.ndarray, fee_r: np.ndarray, min_trades: int) -> tuple[float, list[dict], bool]:
    """Scan thresholds; pick the one with the best (shrunk) expectancy in R that trades enough.

    Returns (threshold, curve, has_edge). If no threshold has a positive expectancy after costs the
    model is declared edgeless and the bot will not trade on it.
    """
    curve = []
    best_t, best_score = NO_TRADE_THRESHOLD, 0.0
    for t in THRESHOLDS:
        m = p >= t
        n = int(m.sum())
        if n == 0:
            curve.append({"threshold": float(t), "trades": 0, "win_rate": None, "expectancy_r": None})
            continue
        win = float(y[m].mean())
        exp_r = float((r[m] - fee_r[m]).mean())
        curve.append({"threshold": float(t), "trades": n, "win_rate": win, "expectancy_r": exp_r})
        if n >= min_trades:
            # Shrink towards zero when few trades so we do not chase noisy tails.
            score = exp_r * np.sqrt(n / (n + 50.0))
            if score > best_score:
                best_t, best_score = float(t), score
    return best_t, curve, best_t < NO_TRADE_THRESHOLD


@dataclass
class TrainStatus:
    state: str = "idle"  # idle | running | done | error
    progress: float = 0.0
    message: str = ""
    started_at: float | None = None
    finished_at: float | None = None


@dataclass
class AIModel:
    clf: HistGradientBoostingClassifier | None = None
    calibrator: PlattCalibrator | None = None
    threshold: float = 0.6
    meta: dict = field(default_factory=dict)
    status: TrainStatus = field(default_factory=TrainStatus)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    @property
    def ready(self) -> bool:
        return self.clf is not None and self.calibrator is not None

    # -- inference ---------------------------------------------------------------------------
    def predict_proba(self, feats: pd.DataFrame) -> np.ndarray:
        out = np.full(len(feats), np.nan)
        if not self.ready or feats.empty:
            return out
        x = feats[FEATURES].to_numpy(dtype=np.float32)
        valid = ~np.isnan(x).all(axis=1) & ~np.isnan(x[:, FEATURES.index("d_ema200")])
        if valid.any():
            raw = self.clf.predict_proba(x[valid])[:, 1]
            out[valid] = self.calibrator.predict(raw)
        return out

    # -- persistence -------------------------------------------------------------------------
    def save(self) -> None:
        joblib.dump({"clf": self.clf, "calibrator": self.calibrator, "threshold": self.threshold}, MODEL_PATH)
        META_PATH.write_text(json.dumps(self.meta, ensure_ascii=False, indent=1), encoding="utf-8")

    def load(self) -> bool:
        if not MODEL_PATH.exists():
            return False
        try:
            blob = joblib.load(MODEL_PATH)
            self.clf, self.calibrator, self.threshold = blob["clf"], blob["calibrator"], float(blob["threshold"])
            self.meta = json.loads(META_PATH.read_text(encoding="utf-8")) if META_PATH.exists() else {}
            return True
        except Exception as exc:  # incompatible sklearn version etc.
            log.warning("Could not load model: %s", exc)
            return False

    # -- training ----------------------------------------------------------------------------
    @staticmethod
    def build_dataset(frames: dict[str, pd.DataFrame], cfg: BotConfig, context: pd.DataFrame | None = None) -> pd.DataFrame:
        """`context` is raw BTC/USDT OHLCV (taken from `frames` when BTC is traded)."""
        if context is None:
            context = frames.get(CONTEXT_SYMBOL)
        ctx = market_context(add_indicators(context)) if context is not None and len(context) > 250 else None
        parts = []
        for symbol, raw in frames.items():
            if len(raw) < 400:
                continue
            ind = add_indicators(raw)
            feats = build_features(ind, ctx)
            y, r = triple_barrier_labels(ind, cfg.sl_atr_mult, cfg.tp1_r, cfg.horizon_bars)
            part = feats.copy()
            part["y"], part["r"] = y, r
            part["time"] = ind["time"].to_numpy()
            part["symbol"] = symbol
            # Round-trip costs expressed in R units for this sample.
            risk_pct = (cfg.sl_atr_mult * ind["atr"] / ind["close"]).to_numpy()
            part["fee_r"] = (2 * (cfg.fee_pct + cfg.slippage_pct) / 100.0) / np.where(risk_pct > 0, risk_pct, np.nan)
            ex = expert_scores(ind)
            reg = regime_series(ind)
            part["cand"] = entry_filters(ind, cfg, ctx, reg, rule_score(ex, reg))["candidate"].to_numpy()
            part = part.iloc[250:]  # indicator warm-up (EMA200, ATR rank)
            parts.append(part.dropna(subset=["y", "d_ema200", "fee_r"]))
        if not parts:
            raise ValueError("Eğitim için yeterli veri yok")
        data = pd.concat(parts, ignore_index=True).sort_values(["time", "symbol"], kind="stable").reset_index(drop=True)
        return data

    @staticmethod
    def _candidates(df: pd.DataFrame) -> pd.DataFrame:
        """Rows the model will actually be asked about; falls back to all rows if too few."""
        c = df[df["cand"]]
        return c if len(c) >= 100 else df

    def fit_block(self, data: pd.DataFrame, train_end: float, val_end: float, gap: float):
        """Train on time < train_end-gap, calibrate + pick the threshold on candidate bars in
        [train_end, val_end). The classifier learns from all bars (more data), the decision layer
        is tuned on the population it will be applied to."""
        tr = data[data["time"] < train_end - gap]
        va = data[(data["time"] >= train_end) & (data["time"] < val_end)]
        if len(tr) < 500 or len(va) < 150:
            raise ValueError("Veri bölümleri çok küçük; daha uzun geçmiş seçin")
        clf = _new_classifier().fit(tr[FEATURES].to_numpy(np.float32), tr["y"].to_numpy(int))
        vc = self._candidates(va)
        raw = clf.predict_proba(vc[FEATURES].to_numpy(np.float32))[:, 1]
        cal = PlattCalibrator().fit(raw, vc["y"].to_numpy(int))
        p = cal.predict(raw)
        thr, curve, edge = _choose_threshold(p, vc["y"].to_numpy(float), vc["r"].to_numpy(float),
                                             vc["fee_r"].to_numpy(float), max(20, int(0.03 * len(vc))))
        return clf, cal, thr, curve, edge, len(tr), len(vc)

    def evaluate(self, clf, cal, thr, te: pd.DataFrame) -> dict:
        tc = self._candidates(te)
        p = cal.predict(clf.predict_proba(tc[FEATURES].to_numpy(np.float32))[:, 1])
        y, r, fr = tc["y"].to_numpy(float), tc["r"].to_numpy(float), tc["fee_r"].to_numpy(float)
        m = p >= thr
        n = int(m.sum())
        try:
            auc = float(roc_auc_score(y, p)) if len(np.unique(y)) == 2 else None
        except ValueError:
            auc = None
        return {
            "samples": int(len(te)),
            "candidates": int(len(tc)),
            "base_rate": float(y.mean()),
            "auc": auc,
            "threshold": float(thr),
            "signals": n,
            "win_rate": float(y[m].mean()) if n else None,
            "expectancy_r": float((r[m] - fr[m]).mean()) if n else None,
            "base_expectancy_r": float((r - fr).mean()),
            "from": int(te["time"].min()),
            "to": int(te["time"].max()),
        }

    def train(self, frames: dict[str, pd.DataFrame], cfg: BotConfig, context: pd.DataFrame | None = None,
              n_folds: int = 4, persist: bool = True) -> dict:
        """Full walk-forward evaluation followed by the production fit. Thread-safe.

        `persist=False` keeps the model in memory only (used by backtests)."""
        with self._lock:
            st = self.status
            st.state, st.progress, st.message, st.started_at, st.finished_at = "running", 0.05, "Veri seti hazırlanıyor", time.time(), None
            try:
                data = self.build_dataset(frames, cfg, context)
                gap = cfg.horizon_bars * cfg.tf_seconds
                times = np.sort(data["time"].unique())
                q = lambda f: float(times[min(len(times) - 1, int(f * len(times)))])  # noqa: E731

                folds = []
                bounds = np.linspace(0.55, 1.0, n_folds + 1)
                for k in range(n_folds):
                    st.message = f"Walk-forward kat {k + 1}/{n_folds} eğitiliyor"
                    st.progress = 0.1 + 0.6 * k / n_folds
                    val_start = q(bounds[k] - 0.15)
                    test_start = q(bounds[k])
                    test_end = q(bounds[k + 1]) if k < n_folds - 1 else float(times[-1]) + 1
                    clf, cal, thr, _, _, n_tr, _ = self.fit_block(data, val_start, test_start - gap, gap)
                    te = data[(data["time"] >= test_start) & (data["time"] < test_end)]
                    if len(te) < 50:
                        continue
                    res = self.evaluate(clf, cal, thr, te)
                    res["fold"] = k + 1
                    res["train_samples"] = n_tr
                    folds.append(res)

                st.message, st.progress = "Nihai model eğitiliyor", 0.75
                val_start = q(0.80)
                clf, cal, thr, curve, edge, n_tr, n_va = self.fit_block(data, val_start, float(times[-1]) + 1, gap)

                st.message, st.progress = "Özellik önemleri hesaplanıyor", 0.88
                va = self._candidates(data[data["time"] >= val_start])
                sample = va.sample(min(len(va), 4000), random_state=1)
                imp = permutation_importance(
                    clf, sample[FEATURES].to_numpy(np.float32), sample["y"].to_numpy(int),
                    scoring="roc_auc", n_repeats=3, random_state=1, n_jobs=1,
                )
                importance = sorted(
                    ({"feature": f, "label": FEATURE_LABELS.get(f, f), "importance": float(v)}
                     for f, v in zip(FEATURES, imp.importances_mean)),
                    key=lambda d: d["importance"], reverse=True,
                )

                def avg(key):
                    vals = [f[key] for f in folds if f.get(key) is not None]
                    return float(np.mean(vals)) if vals else None

                total_signals = sum(f["signals"] for f in folds)
                pooled_wins = sum((f["win_rate"] or 0) * f["signals"] for f in folds)
                pooled_exp = (sum((f["expectancy_r"] or 0) * f["signals"] for f in folds) / total_signals
                              if total_signals else None)
                auc_avg = avg("auc") or 0.5
                # Trade only if BOTH the out-of-sample walk-forward and the final calibration agree
                # that there is a positive expectancy after costs.
                edge_ok = bool(edge and total_signals >= 20 and pooled_exp is not None and pooled_exp > 0)
                quality = "strong" if edge_ok and auc_avg >= 0.54 and pooled_exp >= 0.05 else ("weak" if edge_ok else "none")
                calibrated_thr = float(thr)
                if not edge_ok:
                    thr = NO_TRADE_THRESHOLD
                self.clf, self.calibrator, self.threshold = clf, cal, float(thr)
                self.meta = {
                    "trained_at": time.time(),
                    "symbols": sorted(data["symbol"].unique().tolist()),
                    "timeframe": cfg.timeframe,
                    "samples": int(len(data)),
                    "train_samples": n_tr,
                    "calibration_samples": n_va,
                    "data_from": int(times[0]),
                    "data_to": int(times[-1]),
                    "horizon_bars": cfg.horizon_bars,
                    "label": f"TP1 ({cfg.tp1_r}R) stoptan ({cfg.sl_atr_mult}×ATR) önce",
                    "sl_atr_mult": cfg.sl_atr_mult,
                    "tp1_r": cfg.tp1_r,
                    "threshold": float(thr),
                    "calibrated_threshold": calibrated_thr,
                    "has_edge": edge_ok,
                    "quality": quality,
                    "candidate_rate": float(data["cand"].mean()),
                    "iterations": int(clf.n_iter_),
                    "base_rate": float(data["y"].mean()),
                    "folds": folds,
                    "summary": {
                        "avg_auc": avg("auc"),
                        "avg_win_rate": avg("win_rate"),
                        "pooled_win_rate": pooled_wins / total_signals if total_signals else None,
                        "pooled_expectancy_r": pooled_exp,
                        "avg_expectancy_r": avg("expectancy_r"),
                        "avg_base_rate": avg("base_rate"),
                        "avg_base_expectancy_r": avg("base_expectancy_r"),
                        "total_signals": total_signals,
                    },
                    "threshold_curve": curve,
                    "importance": importance,
                }
                if persist:
                    self.save()
                st.state, st.progress, st.message = "done", 1.0, "Model eğitildi"
                return self.meta
            except Exception as exc:
                log.exception("training failed")
                st.state, st.message = "error", f"Eğitim hatası: {exc}"
                raise
            finally:
                st.finished_at = time.time()


ai_model = AIModel()
ai_model.load()
