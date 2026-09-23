"""Market regime detection, rule-based "expert" votes and the combined AI signal.

The exact same vectorised code path is used by the live engine (last row) and by the backtester
(all rows), so what you see in a backtest is what the bot does live.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from .config import BotConfig
from .experts import EXPERT_LABELS, EXPERTS, REGIME_LABELS, REGIME_WEIGHTS, expert_scores, regime_series, rule_score
from .features import build_features
from .fmt import num, pct

if TYPE_CHECKING:
    from .ai_model import AIModel

DEFAULT_THRESHOLD = 0.60
EXIT_PROB = 0.40


def entry_filters(ind: pd.DataFrame, cfg: BotConfig, ctx: pd.DataFrame | None, regime: pd.Series, rule: pd.Series) -> pd.DataFrame:
    """Hard pre-conditions for a long entry. Bars passing all of them are "candidates": the AI
    model is calibrated on, and decides among, exactly these bars (meta-labelling)."""
    warm = ind["ema200"].notna() & ind["atr"].notna() & ind["adx"].notna()
    blocked_trend = pd.Series(False, index=ind.index)
    if cfg.trend_filter:
        blocked_trend = (regime == "trend_down") | ((ind["close"] < ind["ema200"]) & (ind["ema50"] < ind["ema200"]))
    if cfg.btc_filter and ctx is not None:
        btc_regime = ind["time"].astype("int64").map(ctx["btc_regime"]).fillna("neutral")
        blocked_trend = blocked_trend | (btc_regime == "trend_down").to_numpy()
    blocked_vol = ind["atr_pct_rank"].fillna(0.5) > 0.97
    thin = ind["vol_ratio"].fillna(1.0) < 0.3
    f = pd.DataFrame(index=ind.index)
    f["blocked_trend"] = blocked_trend.astype(bool)
    f["blocked_vol"] = blocked_vol
    f["candidate"] = warm & ~f["blocked_trend"] & ~blocked_vol & ~thin & (rule >= cfg.min_rule_score)
    return f


def signal_frame(ind: pd.DataFrame, cfg: BotConfig, model: "AIModel | None", ctx: pd.DataFrame | None = None) -> pd.DataFrame:
    """Compute the full decision frame. Row t uses only information available at the close of t.

    `ctx` is the BTC market context from features.market_context (used by the model and the
    BTC filter; optional)."""
    experts = expert_scores(ind)
    regime = regime_series(ind)
    rule = rule_score(experts, regime)
    filters = entry_filters(ind, cfg, ctx, regime, rule)

    out = experts.copy()
    out["regime"] = regime
    out["rule_score"] = rule
    out = out.join(filters)
    has_model = cfg.strategy_mode == "ai" and model is not None and model.ready
    if has_model:
        out["prob"] = model.predict_proba(build_features(ind, ctx))
        threshold = cfg.ai_threshold if cfg.ai_threshold > 0 else model.threshold
        edge = out["prob"] >= threshold
        conf = 0.7 * out["prob"].fillna(0) + 0.3 * (rule + 1) / 2
        exit_sig = (out["prob"] < EXIT_PROB) & (rule < -0.25)
    else:
        out["prob"] = np.nan
        threshold = cfg.ai_threshold if cfg.ai_threshold > 0 else DEFAULT_THRESHOLD
        edge = rule >= max(0.45, cfg.min_rule_score + 0.3)
        conf = (rule + 1) / 2
        exit_sig = rule < -0.4
    out["threshold"] = threshold
    out["confidence"] = conf.clip(0, 1)
    out["buy"] = filters["candidate"] & edge
    out["exit"] = ind["ema200"].notna() & exit_sig
    return out


def price_digits(price: float) -> int:
    if price >= 1000:
        return 2
    if price >= 1:
        return 4
    if price >= 0.01:
        return 5
    return 8


def explain(symbol: str, ind: pd.DataFrame, sig: pd.DataFrame, cfg: BotConfig, model: "AIModel | None") -> dict:
    """Human readable breakdown (Turkish) of the latest closed bar's decision."""
    r = ind.iloc[-1]
    s = sig.iloc[-1]
    price = float(r["close"])
    d = price_digits(price)
    reasons: list[dict] = []

    def add(text: str, impact: str) -> None:
        reasons.append({"text": text, "impact": impact})

    prob = None if pd.isna(s["prob"]) else float(s["prob"])
    thr = float(s["threshold"])
    if prob is not None and thr > 1:
        add(f"AI modeli kazanma olasılığı {pct(prob * 100)} — model doğrulamada avantaj bulamadığı için işlem açılmıyor", "negative")
    elif prob is not None:
        add(
            f"AI modeli kazanma olasılığı {pct(prob * 100)} (eşik {pct(thr * 100, 0)})",
            "positive" if prob >= thr else ("negative" if prob < EXIT_PROB else "neutral"),
        )
    elif cfg.strategy_mode == "rules":
        add("Kural tabanlı mod: karar 6 uzmanın ağırlıklı oyuyla veriliyor", "neutral")
    else:
        add("AI modeli henüz eğitilmedi — yalnızca kural tabanlı uzmanlar kullanılıyor", "neutral")

    if r["ema20"] > r["ema50"] > r["ema200"]:
        add("EMA20 > EMA50 > EMA200: güçlü yükseliş dizilimi", "positive")
    elif r["ema20"] < r["ema50"] < r["ema200"]:
        add("EMA20 < EMA50 < EMA200: düşüş dizilimi", "negative")
    add(
        f"Fiyat EMA200'ün {'üzerinde' if price > r['ema200'] else 'altında'} ({pct((price / r['ema200'] - 1) * 100, 2, sign=True)})",
        "positive" if price > r["ema200"] else "negative",
    )
    rsi = float(r["rsi"])
    if rsi >= 70:
        add(f"RSI {num(rsi, 1)}: aşırı alım bölgesi, geri çekilme riski", "negative")
    elif rsi <= 30:
        add(f"RSI {num(rsi, 1)}: aşırı satım bölgesi, tepki alımı potansiyeli", "positive")
    else:
        add(f"RSI {num(rsi, 1)}: {'pozitif' if rsi >= 50 else 'zayıf'} momentum", "positive" if rsi >= 50 else "negative")
    add(
        f"MACD histogramı {'pozitif' if r['macd_hist'] > 0 else 'negatif'} ve {'artıyor' if s['momentum'] > 0 else 'azalıyor'}",
        "positive" if r["macd_hist"] > 0 else "negative",
    )
    adx = float(r["adx"])
    add(f"ADX {num(adx, 1)}: {'güçlü trend' if adx >= 25 else ('zayıf trend' if adx >= 18 else 'trend yok / yatay')}", "neutral")
    if r["vol_ratio"] >= 1.5:
        add(f"Hacim ortalamanın {num(r['vol_ratio'], 1)} katı: güçlü katılım", "positive" if r["close"] > r["open"] else "negative")
    add(f"Supertrend {'AL' if r['st_dir'] > 0 else 'SAT'} yönünde", "positive" if r["st_dir"] > 0 else "negative")
    if s["blocked_trend"]:
        add("Trend filtresi aktif: coin veya BTC düşüş trendinde, alım yapılmaz", "negative")
    if s["blocked_vol"]:
        add("Volatilite aşırı yüksek: risk nedeniyle işlem açılmaz", "negative")

    atr = float(r["atr"])
    risk = cfg.sl_atr_mult * atr
    levels = {
        "entry": price,
        "stop_loss": price - risk,
        "tp1": price + cfg.tp1_r * risk,
        "tp2": price + cfg.tp2_r * risk,
        "risk_pct": risk / price * 100,
        "rr": cfg.tp2_r,
    }
    action = "BUY" if s["buy"] else ("EXIT" if s["exit"] else "WAIT")
    return {
        "symbol": symbol,
        "time": int(r["time"]),
        "price": price,
        "price_digits": d,
        "action": action,
        "prob": prob,
        "threshold": thr,
        "rule_score": float(s["rule_score"]),
        "confidence": float(s["confidence"]),
        "regime": s["regime"],
        "regime_label": REGIME_LABELS[s["regime"]],
        "experts": [
            {"key": k, "label": EXPERT_LABELS[k], "score": float(s[k]), "weight": REGIME_WEIGHTS[s["regime"]][k]}
            for k in EXPERTS
        ],
        "reasons": reasons,
        "levels": levels,
        "indicators": {
            "rsi": rsi, "adx": adx, "atr": atr, "atr_pct": float(r["atr_pct"] * 100),
            "macd_hist": float(r["macd_hist"]), "bb_pctb": float(r["bb_pctb"]), "mfi": float(r["mfi"]),
            "stoch_k": float(r["stoch_k"]), "vol_ratio": float(r["vol_ratio"]), "cci": float(r["cci"]),
            "ema20": float(r["ema20"]), "ema50": float(r["ema50"]), "ema200": float(r["ema200"]),
            "vwap": float(r["vwap"]), "change_24": float(price / float(ind["close"].iloc[-25]) - 1) * 100 if len(ind) > 25 else 0.0,
        },
        "model_ready": bool(model is not None and model.ready),
        "model_edge": bool(model is not None and model.ready and model.meta.get("has_edge", False)),
        "strategy_mode": cfg.strategy_mode,
    }
