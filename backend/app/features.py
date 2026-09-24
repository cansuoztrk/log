"""Feature engineering and labelling for the AI model.

Features are scale-free (ratios, z-scores, bounded oscillators) so one model can be trained on
several coins at once. Labels follow the triple-barrier method and mirror the bot's real exit
rules: a sample is a win (1) when price reaches the first take-profit before the stop-loss.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .experts import EXPERTS, expert_scores, regime_series, rule_score

CONTEXT_SYMBOL = "BTC/USDT"
CONTEXT_FEATURES = ["btc_ret_6", "btc_ret_24", "btc_ret_96", "btc_d_ema200", "btc_ema50_slope", "btc_st_dir", "btc_adx", "rel_ret_24", "rel_ret_96"]

FEATURES: list[str] = [
    "ret_1", "ret_3", "ret_6", "ret_12", "ret_24", "ret_48", "ret_96", "ret_192",
    "rsi", "rsi7", "rsi_delta", "stoch_k", "stoch_d", "mfi", "cci_n",
    "macd_n", "macd_hist_n", "macd_hist_delta",
    "bb_pctb", "bb_width", "bb_width_chg",
    "atr_pct", "atr_pct_rank", "vol_ratio_atr",
    "adx", "di_diff",
    "d_ema9", "d_ema20", "d_ema50", "d_ema200", "ema20_50", "ema50_200",
    "ema50_slope", "ema200_slope",
    "st_dir", "st_dist",
    "dc_pos", "vwap_dist",
    "vol_z", "vol_ratio", "obv_slope",
    "body", "upper_wick", "lower_wick",
    "range_pos_50", "dist_high_100", "dist_low_100",
    "hour_sin", "hour_cos",
    *[f"x_{e}" for e in EXPERTS], "x_rule", "x_regime_up", "x_regime_down", "x_regime_range",
    *CONTEXT_FEATURES,
]


def market_context(btc_ind: pd.DataFrame | None) -> pd.DataFrame | None:
    """BTC-derived market regime features keyed by candle time (alts tend to follow BTC)."""
    if btc_ind is None or btc_ind.empty:
        return None
    c = btc_ind["close"]
    atr = btc_ind["atr"].replace(0.0, np.nan)
    ctx = pd.DataFrame({
        "btc_ret_6": np.log(c / c.shift(6)),
        "btc_ret_24": np.log(c / c.shift(24)),
        "btc_ret_96": np.log(c / c.shift(96)),
        "btc_d_ema200": (c - btc_ind["ema200"]) / atr,
        "btc_ema50_slope": btc_ind["ema50_slope"],
        "btc_st_dir": btc_ind["st_dir"],
        "btc_adx": btc_ind["adx"] / 100.0,
    })
    ctx["btc_regime"] = regime_series(btc_ind)
    ctx.index = btc_ind["time"].astype("int64").to_numpy()
    return ctx


def build_features(ind: pd.DataFrame, ctx: pd.DataFrame | None = None) -> pd.DataFrame:
    """`ind` must come from indicators.add_indicators, `ctx` from market_context (optional:
    missing context becomes NaN, which the gradient-boosted trees handle natively)."""
    c, h, l, o = ind["close"], ind["high"], ind["low"], ind["open"]
    atr = ind["atr"].replace(0.0, np.nan)
    f = pd.DataFrame(index=ind.index)
    for n in (1, 3, 6, 12, 24, 48, 96, 192):
        f[f"ret_{n}"] = np.log(c / c.shift(n))
    f["rsi"] = ind["rsi"] / 100.0
    f["rsi7"] = ind["rsi7"] / 100.0
    f["rsi_delta"] = ind["rsi"].diff(3) / 100.0
    f["stoch_k"] = ind["stoch_k"] / 100.0
    f["stoch_d"] = ind["stoch_d"] / 100.0
    f["mfi"] = ind["mfi"] / 100.0
    f["cci_n"] = (ind["cci"] / 200.0).clip(-3, 3)
    f["macd_n"] = ind["macd"] / atr
    f["macd_hist_n"] = ind["macd_hist"] / atr
    f["macd_hist_delta"] = ind["macd_hist"].diff(3) / atr
    f["bb_pctb"] = ind["bb_pctb"].clip(-1, 2)
    f["bb_width"] = ind["bb_width"]
    f["bb_width_chg"] = ind["bb_width"].pct_change(10).clip(-2, 5)
    f["atr_pct"] = ind["atr_pct"]
    f["atr_pct_rank"] = ind["atr_pct_rank"]
    f["vol_ratio_atr"] = ind["atr_pct"] / ind["atr_pct"].rolling(100, min_periods=30).mean()
    f["adx"] = ind["adx"] / 100.0
    f["di_diff"] = (ind["plus_di"] - ind["minus_di"]) / 100.0
    for n in (9, 20, 50, 200):
        f[f"d_ema{n}"] = (c - ind[f"ema{n}"]) / atr
    f["ema20_50"] = (ind["ema20"] - ind["ema50"]) / atr
    f["ema50_200"] = (ind["ema50"] - ind["ema200"]) / atr
    f["ema50_slope"] = ind["ema50_slope"]
    f["ema200_slope"] = ind["ema200_slope"]
    f["st_dir"] = ind["st_dir"]
    f["st_dist"] = (c - ind["st_line"]) / atr
    rng = (ind["dc_high"] - ind["dc_low"]).replace(0.0, np.nan)
    f["dc_pos"] = (c - ind["dc_low"]) / rng
    f["vwap_dist"] = (c - ind["vwap"]) / atr
    f["vol_z"] = ind["vol_z"].clip(-5, 10)
    f["vol_ratio"] = ind["vol_ratio"].clip(0, 10)
    obv = ind["obv"]
    f["obv_slope"] = (obv - obv.shift(10)) / ind["volume"].rolling(50, min_periods=20).mean().replace(0.0, np.nan) / 10.0
    f["body"] = ind["body"].clip(-5, 5)
    f["upper_wick"] = (h - np.maximum(o, c)) / atr
    f["lower_wick"] = (np.minimum(o, c) - l) / atr
    hi50, lo50 = h.rolling(50, min_periods=50).max(), l.rolling(50, min_periods=50).min()
    f["range_pos_50"] = (c - lo50) / (hi50 - lo50).replace(0.0, np.nan)
    f["dist_high_100"] = (h.rolling(100, min_periods=100).max() - c) / atr
    f["dist_low_100"] = (c - l.rolling(100, min_periods=100).min()) / atr
    hour = pd.to_datetime(ind["time"], unit="s", utc=True).dt.hour
    f["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    f["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)

    ex = expert_scores(ind)
    reg = regime_series(ind)
    for e in EXPERTS:
        f[f"x_{e}"] = ex[e]
    f["x_rule"] = rule_score(ex, reg)
    f["x_regime_up"] = (reg == "trend_up").astype(float)
    f["x_regime_down"] = (reg == "trend_down").astype(float)
    f["x_regime_range"] = (reg == "range").astype(float)

    times = ind["time"].astype("int64")
    if ctx is not None:
        for col in CONTEXT_FEATURES[:-2]:
            f[col] = times.map(ctx[col]).to_numpy()
    else:
        for col in CONTEXT_FEATURES[:-2]:
            f[col] = np.nan
    f["rel_ret_24"] = f["ret_24"] - f["btc_ret_24"]
    f["rel_ret_96"] = f["ret_96"] - f["btc_ret_96"]
    return f[FEATURES].replace([np.inf, -np.inf], np.nan).astype("float32")


def triple_barrier_labels(
    ind: pd.DataFrame, sl_atr_mult: float, tp_r: float, horizon: int
) -> tuple[pd.Series, pd.Series]:
    """Label each bar by simulating a long entry at the NEXT bar's open (as the bot trades).

    Returns (label, outcome_r) where label is 1 (take-profit first), 0 (stop first or timeout
    below entry) and NaN where the future is not yet known. outcome_r is the realised R multiple.
    When one bar touches both barriers the stop is assumed to have been hit first (pessimistic).
    """
    o = ind["open"].to_numpy(float)
    h = ind["high"].to_numpy(float)
    lo = ind["low"].to_numpy(float)
    c = ind["close"].to_numpy(float)
    a = ind["atr"].to_numpy(float)
    n = len(c)
    label = np.full(n, np.nan)
    out_r = np.full(n, np.nan)
    for i in range(n - 1):
        if np.isnan(a[i]) or a[i] <= 0:
            continue
        entry = o[i + 1]
        risk = sl_atr_mult * a[i]
        stop, target = entry - risk, entry + tp_r * risk
        end = min(n, i + 1 + horizon)
        if i + 1 + horizon > n:
            break  # future not fully observed
        result = None
        for j in range(i + 1, end):
            if lo[j] <= stop:
                result = (0.0, -1.0)
                break
            if h[j] >= target:
                result = (1.0, tp_r)
                break
        if result is None:
            r = (c[end - 1] - entry) / risk
            result = (1.0 if r > 0.25 * tp_r else 0.0, float(r))
        label[i], out_r[i] = result
    return pd.Series(label, index=ind.index), pd.Series(out_r, index=ind.index)
