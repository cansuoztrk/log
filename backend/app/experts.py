"""Rule-based "experts" and market regime detection (pure functions of the indicator frame)."""
from __future__ import annotations

import numpy as np
import pandas as pd

EXPERTS = ["trend", "momentum", "mean_reversion", "breakout", "volume", "supertrend"]
EXPERT_LABELS = {
    "trend": "Trend (EMA dizilimi)",
    "momentum": "Momentum (MACD/RSI)",
    "mean_reversion": "Ortalamaya Dönüş",
    "breakout": "Kırılım (Donchian)",
    "volume": "Hacim & Para Akışı",
    "supertrend": "Supertrend/VWAP",
}
REGIME_LABELS = {
    "trend_up": "Yükseliş Trendi",
    "trend_down": "Düşüş Trendi",
    "range": "Yatay Piyasa",
    "volatile": "Aşırı Volatil",
    "neutral": "Kararsız",
}
REGIME_WEIGHTS = {
    "trend_up": {"trend": .25, "momentum": .25, "mean_reversion": .05, "breakout": .20, "volume": .10, "supertrend": .15},
    "trend_down": {"trend": .30, "momentum": .20, "mean_reversion": .10, "breakout": .10, "volume": .10, "supertrend": .20},
    "range": {"trend": .10, "momentum": .15, "mean_reversion": .35, "breakout": .15, "volume": .15, "supertrend": .10},
    "volatile": {"trend": .20, "momentum": .20, "mean_reversion": .10, "breakout": .10, "volume": .20, "supertrend": .20},
    "neutral": {"trend": .20, "momentum": .20, "mean_reversion": .15, "breakout": .15, "volume": .15, "supertrend": .15},
}


def regime_series(ind: pd.DataFrame) -> pd.Series:
    adx = ind["adx"].fillna(0)
    up = (adx >= 22) & (ind["ema50_slope"] > 0) & (ind["close"] > ind["ema200"])
    down = (adx >= 22) & (ind["ema50_slope"] < 0) & (ind["close"] < ind["ema200"])
    rng = adx < 18
    vol = ind["atr_pct_rank"].fillna(0.5) > 0.95
    out = np.select([vol, up, down, rng], ["volatile", "trend_up", "trend_down", "range"], default="neutral")
    return pd.Series(out, index=ind.index)


def expert_scores(ind: pd.DataFrame) -> pd.DataFrame:
    c = ind["close"]
    sgn = np.sign
    e = pd.DataFrame(index=ind.index)

    strength = (ind["adx"] / 25.0).clip(0.4, 1.0)
    e["trend"] = (
        sgn(c - ind["ema200"]) + sgn(ind["ema20"] - ind["ema50"]) + sgn(ind["ema50"] - ind["ema200"]) + sgn(ind["ema50_slope"])
    ) / 4.0 * strength

    rsi = ind["rsi"]
    mom = 0.4 * sgn(ind["macd_hist"]) + 0.3 * sgn(ind["macd_hist"].diff()) + 0.3 * ((rsi - 50) / 20).clip(-1, 1)
    mom = mom.where(rsi < 75, mom - 0.3)  # overbought: momentum likely exhausted
    e["momentum"] = mom

    pctb = ind["bb_pctb"]
    oversold = ((35 - rsi) / 15).clip(0, 1) * 0.6 + ((0.1 - pctb) / 0.3).clip(0, 1) * 0.4
    overbought = ((rsi - 65) / 15).clip(0, 1) * 0.6 + ((pctb - 0.9) / 0.3).clip(0, 1) * 0.4
    mr = oversold - overbought
    knife = (ind["adx"] > 30) & (c < ind["ema200"])
    e["mean_reversion"] = mr.where(~knife, mr * 0.3)

    prev_hi, prev_lo = ind["dc_high"].shift(1), ind["dc_low"].shift(1)
    vol_boost = (ind["vol_ratio"] / 2.0).clip(0.3, 1.0)
    bo = pd.Series(0.0, index=ind.index)
    bo = bo.mask(c > prev_hi, vol_boost).mask(c < prev_lo, -vol_boost)
    # Recent breakout keeps half its weight for a few bars.
    e["breakout"] = bo.where(bo != 0, bo.replace(0, np.nan).ffill(limit=3).fillna(0) * 0.5)

    obv_s = sgn(ind["obv"] - ind["obv"].shift(10))
    mfi = ind["mfi"]
    flow = 0.5 * obv_s + 0.5 * ((mfi - 50) / 30).clip(-1, 1)
    e["volume"] = flow.where(mfi < 85, flow - 0.4)

    e["supertrend"] = 0.7 * ind["st_dir"] + 0.3 * sgn(c - ind["vwap"])
    return e.clip(-1, 1).fillna(0.0)


def rule_score(experts: pd.DataFrame, regime: pd.Series) -> pd.Series:
    weights = pd.DataFrame([REGIME_WEIGHTS[r] for r in regime], index=experts.index)[EXPERTS]
    return (experts[EXPERTS] * weights).sum(axis=1).clip(-1, 1)
