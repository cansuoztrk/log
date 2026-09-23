"""Technical indicators implemented with pandas/numpy (no TA-Lib dependency).

All functions are causal: the value at row t only uses data up to and including row t.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).mean()


def wilder(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(alpha=1.0 / n, adjust=False, min_periods=n).mean()


def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    delta = close.diff()
    gain = wilder(delta.clip(lower=0.0), n)
    loss = wilder((-delta).clip(lower=0.0), n)
    rs = gain / loss.replace(0.0, np.nan)
    out = 100.0 - 100.0 / (1.0 + rs)
    # No losses in the window -> RSI 100; flat window -> 50.
    out = out.where(loss != 0.0, np.where(gain > 0.0, 100.0, 50.0))
    return out.where(gain.notna())


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    line = ema(close, fast) - ema(close, slow)
    sig = line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return line, sig, line - sig


def bollinger(close: pd.Series, n: int = 20, k: float = 2.0):
    mid = sma(close, n)
    std = close.rolling(n, min_periods=n).std(ddof=0)
    return mid - k * std, mid, mid + k * std


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    prev = close.shift(1)
    return pd.concat([high - low, (high - prev).abs(), (low - prev).abs()], axis=1).max(axis=1)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, n: int = 14) -> pd.Series:
    return wilder(true_range(high, low, close), n)


def adx(high: pd.Series, low: pd.Series, close: pd.Series, n: int = 14):
    up = high.diff()
    down = -low.diff()
    plus_dm = pd.Series(np.where((up > down) & (up > 0), up, 0.0), index=high.index)
    minus_dm = pd.Series(np.where((down > up) & (down > 0), down, 0.0), index=high.index)
    tr = wilder(true_range(high, low, close), n)
    plus_di = 100.0 * wilder(plus_dm, n) / tr.replace(0.0, np.nan)
    minus_di = 100.0 * wilder(minus_dm, n) / tr.replace(0.0, np.nan)
    dx = 100.0 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0.0, np.nan)
    return wilder(dx, n), plus_di, minus_di


def stoch_rsi(close: pd.Series, n: int = 14, k: int = 3, d: int = 3):
    r = rsi(close, n)
    lo = r.rolling(n, min_periods=n).min()
    hi = r.rolling(n, min_periods=n).max()
    raw = 100.0 * (r - lo) / (hi - lo).replace(0.0, np.nan)
    k_line = raw.rolling(k, min_periods=k).mean()
    return k_line, k_line.rolling(d, min_periods=d).mean()


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    direction = np.sign(close.diff()).fillna(0.0)
    return (direction * volume).cumsum()


def mfi(high, low, close, volume, n: int = 14) -> pd.Series:
    tp = (high + low + close) / 3.0
    flow = tp * volume
    pos = flow.where(tp > tp.shift(1), 0.0).rolling(n, min_periods=n).sum()
    neg = flow.where(tp < tp.shift(1), 0.0).rolling(n, min_periods=n).sum()
    ratio = pos / neg.replace(0.0, np.nan)
    out = 100.0 - 100.0 / (1.0 + ratio)
    return out.where(neg != 0.0, 100.0).where(pos.notna())


def cci(high, low, close, n: int = 20) -> pd.Series:
    tp = (high + low + close) / 3.0
    mean = tp.rolling(n, min_periods=n).mean()
    mad = tp.rolling(n, min_periods=n).apply(lambda x: np.mean(np.abs(x - x.mean())), raw=True)
    return (tp - mean) / (0.015 * mad.replace(0.0, np.nan))


def donchian(high: pd.Series, low: pd.Series, n: int = 20):
    return low.rolling(n, min_periods=n).min(), high.rolling(n, min_periods=n).max()


def supertrend(high, low, close, n: int = 10, mult: float = 3.0):
    """Returns (line, direction) where direction is +1 (bullish) or -1 (bearish)."""
    a = atr(high, low, close, n).to_numpy()
    h, l, c = high.to_numpy(), low.to_numpy(), close.to_numpy()
    hl2 = (h + l) / 2.0
    upper = hl2 + mult * a
    lower = hl2 - mult * a
    size = len(c)
    fu, fl = np.full(size, np.nan), np.full(size, np.nan)
    line, direction = np.full(size, np.nan), np.zeros(size)
    for i in range(size):
        if np.isnan(a[i]):
            continue
        if i == 0 or np.isnan(fu[i - 1]):
            fu[i], fl[i], direction[i] = upper[i], lower[i], 1
            line[i] = fl[i]
            continue
        fu[i] = upper[i] if (upper[i] < fu[i - 1] or c[i - 1] > fu[i - 1]) else fu[i - 1]
        fl[i] = lower[i] if (lower[i] > fl[i - 1] or c[i - 1] < fl[i - 1]) else fl[i - 1]
        if direction[i - 1] == 1:
            direction[i] = -1 if c[i] < fl[i] else 1
        else:
            direction[i] = 1 if c[i] > fu[i] else -1
        line[i] = fl[i] if direction[i] == 1 else fu[i]
    return pd.Series(line, index=close.index), pd.Series(direction, index=close.index)


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of an OHLCV frame with every indicator the bot uses."""
    out = df.copy()
    o, h, l, c, v = out["open"], out["high"], out["low"], out["close"], out["volume"]

    for n in (9, 20, 50, 100, 200):
        out[f"ema{n}"] = ema(c, n)
    out["rsi"] = rsi(c, 14)
    out["rsi7"] = rsi(c, 7)
    out["macd"], out["macd_signal"], out["macd_hist"] = macd(c)
    out["bb_lower"], out["bb_mid"], out["bb_upper"] = bollinger(c)
    out["bb_pctb"] = (c - out["bb_lower"]) / (out["bb_upper"] - out["bb_lower"]).replace(0.0, np.nan)
    out["bb_width"] = (out["bb_upper"] - out["bb_lower"]) / out["bb_mid"]
    out["atr"] = atr(h, l, c, 14)
    out["atr_pct"] = out["atr"] / c
    out["adx"], out["plus_di"], out["minus_di"] = adx(h, l, c, 14)
    out["stoch_k"], out["stoch_d"] = stoch_rsi(c)
    out["obv"] = obv(c, v)
    out["mfi"] = mfi(h, l, c, v)
    out["cci"] = cci(h, l, c)
    out["dc_low"], out["dc_high"] = donchian(h, l, 20)
    out["st_line"], out["st_dir"] = supertrend(h, l, c)
    vol_mean = v.rolling(20, min_periods=20).mean()
    vol_std = v.rolling(20, min_periods=20).std(ddof=0)
    out["vol_z"] = (v - vol_mean) / vol_std.replace(0.0, np.nan)
    out["vol_ratio"] = v / vol_mean.replace(0.0, np.nan)
    # Rolling VWAP over one "session" of 24 bars.
    tp = (h + l + c) / 3.0
    out["vwap"] = (tp * v).rolling(24, min_periods=24).sum() / v.rolling(24, min_periods=24).sum().replace(0.0, np.nan)
    out["ema50_slope"] = out["ema50"].pct_change(5)
    out["ema200_slope"] = out["ema200"].pct_change(10)
    out["atr_pct_rank"] = out["atr_pct"].rolling(200, min_periods=50).rank(pct=True)
    out["body"] = (c - o) / out["atr"].replace(0.0, np.nan)
    return out
