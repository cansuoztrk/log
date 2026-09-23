"""Performance statistics for trade lists and equity curves."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone

import numpy as np

from .trading import EXIT_LABELS


def _streaks(wins: list[bool]) -> tuple[int, int]:
    best_w = best_l = cur_w = cur_l = 0
    for w in wins:
        if w:
            cur_w, cur_l = cur_w + 1, 0
        else:
            cur_l, cur_w = cur_l + 1, 0
        best_w, best_l = max(best_w, cur_w), max(best_l, cur_l)
    return best_w, best_l


def trade_stats(trades: list[dict]) -> dict:
    n = len(trades)
    if n == 0:
        return {"trades": 0}
    pnl = np.array([t["pnl"] for t in trades], float)
    r = np.array([t.get("r_multiple", 0.0) for t in trades], float)
    wins = pnl > 0
    gross_win = float(pnl[wins].sum())
    gross_loss = float(-pnl[~wins].sum())
    best_w, best_l = _streaks(list(wins))
    held = [t.get("bars_held", 0) for t in trades]
    hold_secs = [t["exit_time"] - t["entry_time"] for t in trades if t.get("exit_time")]
    return {
        "trades": n,
        "wins": int(wins.sum()),
        "losses": int(n - wins.sum()),
        "win_rate": float(wins.mean()),
        "tp1_rate": float(np.mean([bool(t.get("tp1_hit")) for t in trades])),
        "net_pnl": float(pnl.sum()),
        "gross_profit": gross_win,
        "gross_loss": gross_loss,
        "profit_factor": gross_win / gross_loss if gross_loss > 0 else (float("inf") if gross_win > 0 else 0.0),
        "avg_win": float(pnl[wins].mean()) if wins.any() else 0.0,
        "avg_loss": float(pnl[~wins].mean()) if (~wins).any() else 0.0,
        "payoff": float(pnl[wins].mean() / -pnl[~wins].mean()) if wins.any() and (~wins).any() and pnl[~wins].mean() < 0 else None,
        "expectancy": float(pnl.mean()),
        "expectancy_r": float(r.mean()),
        "avg_r_win": float(r[wins].mean()) if wins.any() else 0.0,
        "avg_r_loss": float(r[~wins].mean()) if (~wins).any() else 0.0,
        "best": float(pnl.max()),
        "worst": float(pnl.min()),
        "max_win_streak": best_w,
        "max_loss_streak": best_l,
        "avg_bars_held": float(np.mean(held)) if held else 0.0,
        "avg_hold_hours": float(np.mean(hold_secs) / 3600) if hold_secs else 0.0,
        "fees": float(sum(t.get("fees", 0.0) for t in trades)),
    }


def equity_stats(times: list[int], equity: list[float], bar_seconds: int) -> dict:
    if len(equity) < 2:
        return {}
    eq = np.asarray(equity, float)
    peak = np.maximum.accumulate(eq)
    dd = eq / peak - 1.0
    rets = np.diff(eq) / eq[:-1]
    per_year = 365 * 86400 / bar_seconds
    std = rets.std()
    down = rets[rets < 0]
    years = max((times[-1] - times[0]) / (365 * 86400), 1e-9)
    total = eq[-1] / eq[0] - 1
    cagr = (eq[-1] / eq[0]) ** (1 / years) - 1 if eq[-1] > 0 and years > 0.05 else None
    max_dd = float(dd.min())
    # Longest time spent below a previous peak.
    longest, start = 0, None
    for i, d in enumerate(dd):
        if d < 0 and start is None:
            start = i
        elif d >= 0 and start is not None:
            longest, start = max(longest, i - start), None
    if start is not None:
        longest = max(longest, len(dd) - start)
    return {
        "start_equity": float(eq[0]),
        "end_equity": float(eq[-1]),
        "total_return": float(total),
        "cagr": float(cagr) if cagr is not None else None,
        "max_drawdown": max_dd,
        "sharpe": float(rets.mean() / std * np.sqrt(per_year)) if std > 0 else None,
        "sortino": float(rets.mean() / down.std() * np.sqrt(per_year)) if len(down) > 1 and down.std() > 0 else None,
        "calmar": float(cagr / -max_dd) if cagr is not None and max_dd < 0 else None,
        "volatility": float(std * np.sqrt(per_year)),
        "longest_dd_days": float(longest * bar_seconds / 86400),
    }


def breakdowns(trades: list[dict]) -> dict:
    by_symbol: dict[str, list] = defaultdict(list)
    by_regime: dict[str, list] = defaultdict(list)
    for t in trades:
        by_symbol[t["symbol"]].append(t)
        by_regime[t.get("regime", "neutral")].append(t)

    def summarize(group: dict[str, list]) -> list[dict]:
        rows = []
        for key, ts in group.items():
            pnl = [t["pnl"] for t in ts]
            rows.append({
                "key": key,
                "trades": len(ts),
                "win_rate": float(np.mean([p > 0 for p in pnl])),
                "net_pnl": float(sum(pnl)),
                "avg_r": float(np.mean([t.get("r_multiple", 0.0) for t in ts])),
            })
        return sorted(rows, key=lambda d: d["net_pnl"], reverse=True)

    reasons = Counter(t.get("exit_label") or EXIT_LABELS.get(t.get("exit_reason"), "?") for t in trades)
    monthly: dict[str, float] = defaultdict(float)
    for t in trades:
        key = datetime.fromtimestamp(t["exit_time"], tz=timezone.utc).strftime("%Y-%m")
        monthly[key] += t["pnl"]
    hist_r = np.histogram(np.clip([t.get("r_multiple", 0.0) for t in trades], -2, 4), bins=np.arange(-2, 4.5, 0.5))
    return {
        "by_symbol": summarize(by_symbol),
        "by_regime": summarize(by_regime),
        "exit_reasons": [{"label": k, "count": v} for k, v in reasons.most_common()],
        "monthly_pnl": [{"month": k, "pnl": v} for k, v in sorted(monthly.items())],
        "r_histogram": [{"from": float(a), "to": float(a + 0.5), "count": int(c)} for a, c in zip(hist_r[1][:-1], hist_r[0])],
    }


def monthly_returns(times: list[int], equity: list[float]) -> list[dict]:
    """Month-over-month equity returns (for the heatmap)."""
    if len(equity) < 2:
        return []
    last: dict[str, float] = {}
    first: dict[str, float] = {}
    for t, e in zip(times, equity):
        key = datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m")
        first.setdefault(key, e)
        last[key] = e
    out, prev = [], None
    for key in sorted(last):
        base = prev if prev is not None else first[key]
        out.append({"month": key, "return": last[key] / base - 1 if base else 0.0})
        prev = last[key]
    return out
