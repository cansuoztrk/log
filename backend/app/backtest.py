"""Event-driven, portfolio-level backtester that reuses the live decision and exit logic.

* Signals are computed on a closed bar and filled at the NEXT bar's open (no look-ahead).
* Intrabar exits are resolved pessimistically (stop before target when both are touched).
* Fees and slippage are charged on every fill.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Callable

import numpy as np
import pandas as pd

from .ai_model import AIModel
from .config import BotConfig
from .features import CONTEXT_SYMBOL, market_context
from .indicators import add_indicators
from .metrics import breakdowns, equity_stats, monthly_returns, trade_stats
from .strategy import signal_frame
from .trading import apply_fill, check_exits, close_trade_record, new_position, on_bar_close, position_size

KILL_PAUSE_DAYS = 7


def _downsample(times, values, max_points: int = 1500):
    if len(times) <= max_points:
        return list(times), list(values)
    idx = np.linspace(0, len(times) - 1, max_points).astype(int)
    return [times[i] for i in idx], [values[i] for i in idx]


def run_backtest(
    frames: dict[str, pd.DataFrame],
    cfg: BotConfig,
    model: AIModel | None,
    start_time: int,
    initial_balance: float,
    progress: Callable[[float], None] | None = None,
    context: pd.DataFrame | None = None,
) -> dict:
    fee, slip = cfg.fee_pct / 100.0, cfg.slippage_pct / 100.0
    if context is None:
        context = frames.get(CONTEXT_SYMBOL)
    ctx = market_context(add_indicators(context)) if context is not None and len(context) > 250 else None
    data = {}
    for sym, raw in frames.items():
        if len(raw) < 260:
            continue
        ind = add_indicators(raw).reset_index(drop=True)
        sig = signal_frame(ind, cfg, model, ctx)
        data[sym] = {
            "t": ind["time"].to_numpy(np.int64), "o": ind["open"].to_numpy(float), "h": ind["high"].to_numpy(float),
            "l": ind["low"].to_numpy(float), "c": ind["close"].to_numpy(float), "atr": ind["atr"].to_numpy(float),
            "buy": sig["buy"].to_numpy(bool), "exit": sig["exit"].to_numpy(bool), "prob": sig["prob"].to_numpy(float),
            "conf": sig["confidence"].to_numpy(float), "rule": sig["rule_score"].to_numpy(float),
            "regime": sig["regime"].to_numpy(object), "thr": float(sig["threshold"].iloc[-1]),
        }
        data[sym]["pos_of"] = {int(t): i for i, t in enumerate(data[sym]["t"])}
    if not data:
        raise ValueError("Backtest için yeterli veri yok")

    timeline = sorted({int(t) for d in data.values() for t in d["t"] if t >= start_time})
    if len(timeline) < 10:
        raise ValueError("Backtest aralığı çok kısa")

    cash = initial_balance
    positions: dict[str, object] = {}
    trades: list[dict] = []
    eq_t: list[int] = []
    eq_v: list[float] = []
    last_close: dict[str, float] = {}
    last_loss_idx: dict[str, int] = {}
    peak = initial_balance
    day_key, day_start = None, initial_balance
    halted_until = 0
    kill_events: list[int] = []
    signals_seen = 0
    skipped = {"max_positions": 0, "cash": 0, "daily_limit": 0, "cooldown": 0, "kill_switch": 0}

    def equity() -> float:
        return cash + sum(p.qty * last_close.get(s, p.entry_price) for s, p in positions.items())

    def exit_fill(sym, pos, reason, px, qty, t):
        nonlocal cash
        price = px * (1 - slip)
        f = qty * price * fee
        cash += qty * price - f
        apply_fill(pos, reason, price, qty, f, t)
        if pos.qty <= 0:
            rec = close_trade_record(pos, t)
            trades.append(rec)
            del positions[sym]
            if rec["pnl"] <= 0:
                last_loss_idx[sym] = data[sym]["pos_of"][t]

    for k, t in enumerate(timeline):
        dkey = datetime.fromtimestamp(t, tz=timezone.utc).date()
        if dkey != day_key:
            day_key, day_start = dkey, equity()
        # 1) entries at this bar's open for signals raised on the previous closed bar
        for sym, d in data.items():
            i = d["pos_of"].get(t)
            if i is None or i == 0 or sym in positions or not d["buy"][i - 1]:
                continue
            signals_seen += 1
            eq_now = equity()
            if t < halted_until:
                skipped["kill_switch"] += 1
                continue
            if len(positions) >= cfg.max_open_positions:
                skipped["max_positions"] += 1
                continue
            if eq_now < day_start * (1 - cfg.daily_loss_limit_pct / 100):
                skipped["daily_limit"] += 1
                continue
            if sym in last_loss_idx and i - last_loss_idx[sym] <= cfg.cooldown_bars:
                skipped["cooldown"] += 1
                continue
            atr = d["atr"][i - 1]
            if not atr or np.isnan(atr):
                continue
            price = d["o"][i] * (1 + slip)
            stop = price - cfg.sl_atr_mult * atr
            thr = d["thr"]
            p = d["prob"][i - 1]
            edge = (p - thr) / max(1e-6, 1 - thr) if not np.isnan(p) else (d["conf"][i - 1] - 0.5) * 2
            qty = position_size(eq_now, cash, price, stop, cfg, edge)
            if qty <= 0:
                skipped["cash"] += 1
                continue
            f = qty * price * fee
            cash -= qty * price + f
            positions[sym] = new_position(
                sym, t, price, qty, atr, cfg, entry_fee=f, confidence=float(d["conf"][i - 1]),
                prob=None if np.isnan(p) else float(p), rule_score=float(d["rule"][i - 1]), regime=str(d["regime"][i - 1]),
            )
        # 2) intrabar exits and end-of-bar management
        for sym, d in data.items():
            i = d["pos_of"].get(t)
            if i is None:
                continue
            last_close[sym] = d["c"][i]
            pos = positions.get(sym)
            if pos is None:
                continue
            for reason, px, qty in check_exits(pos, cfg, d["h"][i], d["l"][i], d["o"][i] if pos.entry_time != t else None):
                exit_fill(sym, pos, reason, px, qty, t)
                if sym not in positions:
                    break
            if sym not in positions:
                continue
            for reason, px, qty in on_bar_close(pos, cfg, d["h"][i], d["c"][i], d["atr"][i]):
                exit_fill(sym, pos, reason, px, qty, t)
            if sym in positions and cfg.exit_on_signal_reversal and d["exit"][i]:
                exit_fill(sym, pos, "signal", d["c"][i], pos.qty, t)
        eq = equity()
        peak = max(peak, eq)
        if eq < peak * (1 - cfg.max_drawdown_pct / 100) and t >= halted_until:
            # Kill switch: flatten and pause, then resume with a fresh peak (live bot waits for the user).
            for sym in list(positions):
                exit_fill(sym, positions[sym], "kill", last_close[sym], positions[sym].qty, t)
            eq = equity()
            kill_events.append(t)
            halted_until = t + KILL_PAUSE_DAYS * 86400
            peak = eq
        eq_t.append(t)
        eq_v.append(eq)
        if progress and k % 500 == 0:
            progress(k / len(timeline))

    # Close whatever is still open at the last price so results are complete.
    for sym in list(positions):
        exit_fill(sym, positions[sym], "manual", last_close[sym], positions[sym].qty, timeline[-1])
    if eq_v:
        eq_v[-1] = equity()

    # Equal-weight buy & hold benchmark over the same window.
    bench = np.zeros(len(timeline))
    for d in data.values():
        closes = pd.Series(d["c"], index=d["t"]).reindex(timeline).ffill().bfill().to_numpy()
        bench += closes / closes[0]
    bench = bench / len(data) * initial_balance

    bar_seconds = int(np.median(np.diff(timeline))) if len(timeline) > 1 else 3600
    stats = trade_stats(trades)
    stats.update(equity_stats(eq_t, eq_v, bar_seconds))
    bstats = equity_stats(timeline, list(bench), bar_seconds)
    peak_arr = np.maximum.accumulate(np.asarray(eq_v))
    dd = (np.asarray(eq_v) / peak_arr - 1.0).tolist()
    exposure = 0.0
    if trades:
        held = sum(tr["exit_time"] - tr["entry_time"] for tr in trades)
        exposure = held / ((timeline[-1] - timeline[0]) * max(1, cfg.max_open_positions)) if timeline[-1] > timeline[0] else 0.0
    stats.update({
        "benchmark_return": bstats.get("total_return"),
        "benchmark_max_drawdown": bstats.get("max_drawdown"),
        "exposure": exposure,
        "signals": signals_seen,
        "kill_switch_events": len(kill_events),
    })
    ct, cv = _downsample(eq_t, eq_v)
    _, bv = _downsample(eq_t, list(bench))
    _, dv = _downsample(eq_t, dd)
    return {
        "stats": stats,
        "skipped": skipped,
        "equity": [{"time": a, "equity": b, "benchmark": c, "drawdown": e} for a, b, c, e in zip(ct, cv, bv, dv)],
        "monthly": monthly_returns(eq_t, eq_v),
        "breakdowns": breakdowns(trades),
        "trades": trades[-1000:],
        "start": timeline[0],
        "end": timeline[-1],
        "finished_at": time.time(),
    }
