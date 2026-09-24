"""Market data: real exchange data through ccxt, with a deterministic simulated feed as fallback.

The simulated feed exists so the dashboard, backtests and model training work offline or when the
exchange is unreachable. The UI always shows which source is active.
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import TIMEFRAME_SECONDS, settings

log = logging.getLogger(__name__)

COLUMNS = ["time", "open", "high", "low", "close", "volume"]
CACHE_DIR = settings.data_dir / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def closed_only(df: pd.DataFrame, timeframe: str, now: float | None = None) -> pd.DataFrame:
    """Drop the still-forming last candle (its close lies in the future)."""
    if df.empty:
        return df
    now = time.time() if now is None else now
    last_open = int(df["time"].iloc[-1])
    if last_open + TIMEFRAME_SECONDS[timeframe] > now:
        return df.iloc[:-1]
    return df


# --------------------------------------------------------------------------------------------
# Simulated feed
# --------------------------------------------------------------------------------------------

REFERENCE_PRICES = {
    "BTC": 95_000.0, "ETH": 3_600.0, "SOL": 180.0, "BNB": 700.0, "XRP": 2.4, "ADA": 0.8, "DOGE": 0.25,
    "AVAX": 35.0, "LINK": 18.0, "DOT": 6.5, "TRX": 0.3, "LTC": 95.0, "MATIC": 0.6, "POL": 0.6, "ATOM": 8.0,
    "NEAR": 5.5, "APT": 9.0, "ARB": 0.8, "OP": 1.8, "SUI": 3.5, "PEPE": 0.000012, "TON": 5.0,
}
SIM_ANCHOR = 1_704_067_200  # 2024-01-01 UTC


@dataclass
class _SimSeries:
    t0: int
    tf: int
    close: np.ndarray
    open: np.ndarray
    high: np.ndarray
    low: np.ndarray
    volume: np.ndarray


def _seed(symbol: str, stream: int) -> int:
    return (sum((i + 1) * ord(ch) for i, ch in enumerate(symbol)) * 7919 + stream * 104_729) % (2**32)


def _simulate(symbol: str, timeframe: str, n: int) -> _SimSeries:
    """Regime-switching GARCH-like random walk. Deterministic per symbol and timeframe."""
    tf = TIMEFRAME_SECONDS[timeframe]
    scale = np.sqrt(tf / 3600.0)
    base = symbol.split("/")[0]
    ref = REFERENCE_PRICES.get(base, 1.0 + (_seed(symbol, 9) % 1000) / 10.0)
    z = np.random.default_rng(_seed(symbol, 1)).standard_normal(n)
    u = np.random.default_rng(_seed(symbol, 2)).random(n)
    u2 = np.random.default_rng(_seed(symbol, 6)).random(n)
    wick = np.abs(np.random.default_rng(_seed(symbol, 3)).standard_normal((n, 2)))
    vol_noise = np.random.default_rng(_seed(symbol, 4)).standard_normal(n)

    # Regimes: 0 = bull trend, 1 = bear trend, 2 = range. Persistent Markov chain (~400h per regime).
    stay = 1.0 - min(0.5, scale**2 / 400.0)
    drift = {0: 0.0008, 1: -0.0007, 2: 0.0}
    regime = 2
    sigma2 = (0.006 * scale) ** 2
    base_var = (0.006 * scale) ** 2
    log_ref = np.log(ref)
    lp = log_ref
    closes = np.empty(n)
    opens = np.empty(n)
    rets = np.empty(n)
    prev_r = 0.0
    for i in range(n):
        if u[i] > stay:
            regime = (regime + 1 + int(u2[i] * 2)) % 3
        sigma2 = 0.04 * base_var + 0.10 * prev_r**2 + 0.86 * sigma2
        sig = np.sqrt(sigma2)
        mu = drift[regime] * scale**2
        if regime == 2:
            mu -= 0.02 * (lp - log_ref) * scale**2
        else:
            mu -= 0.002 * (lp - log_ref) * scale**2
        # Mild momentum inside trends gives the models something real to learn.
        mu += (0.08 if regime != 2 else -0.05) * prev_r
        r = mu + sig * z[i]
        opens[i] = lp
        lp += r
        closes[i] = lp
        rets[i] = r
        prev_r = r
    o = np.exp(opens)
    c = np.exp(closes)
    band = np.abs(rets).mean() * 0.6 + 1e-9
    h = np.maximum(o, c) * np.exp(wick[:, 0] * band)
    l = np.minimum(o, c) * np.exp(-wick[:, 1] * band)
    v = (5e7 * scale**2 / max(ref, 1e-9)) * np.exp(0.35 * vol_noise + 18.0 * np.abs(rets) / scale)
    return _SimSeries(SIM_ANCHOR, tf, c, o, h, l, v)


class SimulatedFeed:
    def __init__(self) -> None:
        self._series: dict[tuple[str, str], _SimSeries] = {}
        self._lock = threading.Lock()

    def _get(self, symbol: str, timeframe: str, upto: float) -> _SimSeries:
        tf = TIMEFRAME_SECONDS[timeframe]
        needed = int((upto - SIM_ANCHOR) // tf) + 2
        key = (symbol, timeframe)
        with self._lock:
            s = self._series.get(key)
            if s is None or len(s.close) < needed:
                s = _simulate(symbol, timeframe, needed + int(30 * 86400 / tf))
                self._series[key] = s
            return s

    def ohlcv(self, symbol: str, timeframe: str, since: float | None, limit: int, now: float | None = None) -> pd.DataFrame:
        now = time.time() if now is None else now
        s = self._get(symbol, timeframe, now)
        tf = s.tf
        cur = int((now - s.t0) // tf)  # index of the forming bar
        start = cur - limit + 1 if since is None else max(0, int((since - s.t0) // tf))
        start = max(0, start)
        end = min(cur, start + limit - 1)
        idx = np.arange(start, end + 1)
        df = pd.DataFrame({
            "time": s.t0 + idx * tf,
            "open": s.open[idx], "high": s.high[idx], "low": s.low[idx],
            "close": s.close[idx], "volume": s.volume[idx],
        })
        if len(df) and end == cur:
            # Forming candle: walk a seeded Brownian bridge from open to the final close.
            frac = min(1.0, max(0.0, (now - (s.t0 + cur * tf)) / tf))
            steps = 60
            rng = np.random.default_rng(_seed(symbol, 5) + cur)
            path = np.cumsum(rng.standard_normal(steps)) * 0.25
            path = path - np.linspace(0, 1, steps) * path[-1]
            o, c = s.open[cur], s.close[cur]
            span = max(abs(c - o), 1e-12) + (s.high[cur] - s.low[cur]) * 0.25
            prices = o + (c - o) * np.linspace(0, 1, steps) + path * span * 0.3
            k = max(1, int(frac * (steps - 1)) + 1)
            seen = prices[:k]
            i = len(df) - 1
            df.loc[i, "close"] = float(seen[-1])
            df.loc[i, "high"] = float(max(o, seen.max()))
            df.loc[i, "low"] = float(min(o, seen.min()))
            df.loc[i, "volume"] = float(s.volume[cur] * max(frac, 0.02))
        return df.reset_index(drop=True)


# --------------------------------------------------------------------------------------------
# Unified market data service
# --------------------------------------------------------------------------------------------

class MarketData:
    def __init__(self) -> None:
        self.requested = settings.data_source  # auto | exchange | demo
        self.active: str = "demo" if self.requested == "demo" else "pending"
        self.last_error: str = ""
        self._exchange = None
        self._sim = SimulatedFeed()
        self._lock = threading.RLock()
        self._markets: list[str] = []

    # -- exchange ---------------------------------------------------------------------------
    def exchange(self):
        with self._lock:
            if self._exchange is None:
                import ccxt  # imported lazily: heavy module

                klass = getattr(ccxt, settings.exchange)
                params = {"enableRateLimit": True, "options": {"defaultType": "spot"}, "timeout": 15_000}
                if settings.has_exchange_keys:
                    params.update(apiKey=settings.api_key, secret=settings.api_secret)
                    if settings.api_password:
                        params["password"] = settings.api_password
                self._exchange = klass(params)
            return self._exchange

    def probe(self) -> str:
        """Decide which source to use. Called once at startup (and on demand)."""
        if self.requested == "demo":
            self.active = "demo"
            return self.active
        try:
            ex = self.exchange()
            ex.load_markets()
            self._markets = sorted(
                s for s, m in ex.markets.items()
                if m.get("spot") and m.get("active", True) and s.endswith("/USDT")
            )
            self.active = "exchange"
            self.last_error = ""
        except Exception as exc:  # network errors, geo-blocks, bad exchange id ...
            self.last_error = f"{type(exc).__name__}: {exc}"[:300]
            log.warning("Exchange unreachable (%s)", self.last_error)
            if self.requested == "exchange":
                self.active = "unavailable"
            else:
                self.active = "demo"
        return self.active

    @property
    def is_demo(self) -> bool:
        return self.active == "demo"

    def _ensure(self) -> None:
        if self.active == "pending":
            self.probe()
        if self.active == "unavailable":
            raise RuntimeError(f"Borsaya bağlanılamadı: {self.last_error}")

    # -- public API -------------------------------------------------------------------------
    def markets(self) -> list[str]:
        self._ensure()
        if self.is_demo:
            return sorted(f"{b}/USDT" for b in REFERENCE_PRICES)
        return self._markets

    def ohlcv(self, symbol: str, timeframe: str, limit: int = 500) -> pd.DataFrame:
        """Latest `limit` candles; the last one may still be forming."""
        self._ensure()
        if self.is_demo:
            return self._sim.ohlcv(symbol, timeframe, None, limit)
        raw = self.exchange().fetch_ohlcv(symbol, timeframe, limit=min(limit, 1000))
        return self._frame(raw)

    def history(self, symbol: str, timeframe: str, days: int) -> pd.DataFrame:
        """Closed candles for the last `days` days, paginated and cached on disk."""
        self._ensure()
        tf = TIMEFRAME_SECONDS[timeframe]
        now = time.time()
        since = int(now - days * 86400)
        if self.is_demo:
            n = int(days * 86400 / tf) + 1
            return closed_only(self._sim.ohlcv(symbol, timeframe, since, n, now), timeframe, now)

        path = CACHE_DIR / f"{settings.exchange}_{symbol.replace('/', '_')}_{timeframe}.csv"
        cached = pd.read_csv(path) if path.exists() else pd.DataFrame(columns=COLUMNS)
        if len(cached) and int(cached["time"].iloc[0]) > since:
            cached = pd.DataFrame(columns=COLUMNS)  # cache does not reach back far enough
        cursor = int(cached["time"].iloc[-1]) + tf if len(cached) else since
        frames = [cached] if len(cached) else []
        ex = self.exchange()
        while cursor < now - tf:
            raw = ex.fetch_ohlcv(symbol, timeframe, since=cursor * 1000, limit=1000)
            if not raw:
                break
            part = self._frame(raw)
            frames.append(part)
            nxt = int(part["time"].iloc[-1]) + tf
            if nxt <= cursor:
                break
            cursor = nxt
        df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=COLUMNS)
        df = df.drop_duplicates("time").sort_values("time").reset_index(drop=True)
        df = closed_only(df, timeframe, now)
        df.to_csv(path, index=False)
        return df[df["time"] >= since].reset_index(drop=True)

    def price(self, symbol: str) -> float:
        self._ensure()
        if self.is_demo:
            return float(self._sim.ohlcv(symbol, "1h", None, 1)["close"].iloc[-1])
        return float(self.exchange().fetch_ticker(symbol)["last"])

    @staticmethod
    def _frame(raw) -> pd.DataFrame:
        df = pd.DataFrame(raw, columns=COLUMNS)
        df["time"] = (df["time"] // 1000).astype("int64")
        for c in COLUMNS[1:]:
            df[c] = df[c].astype(float)
        return df


market = MarketData()
