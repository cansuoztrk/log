"""Position model, exit management and position sizing — shared by the live engine and backtester."""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field

from .config import BotConfig

EXIT_LABELS = {
    "stop": "Stop Loss",
    "breakeven": "Başabaş Stop",
    "trailing": "Takip Eden Stop",
    "tp1": "TP1 (kısmi)",
    "tp2": "TP2 Hedef",
    "time": "Zaman Stopu",
    "signal": "Sinyal Döndü",
    "manual": "Manuel Kapatma",
    "kill": "Acil Durdurma",
}


@dataclass
class Position:
    symbol: str
    entry_time: int
    entry_price: float
    qty: float
    stop: float
    tp1: float
    tp2: float
    risk_per_unit: float
    atr: float
    confidence: float = 0.0
    prob: float | None = None
    rule_score: float = 0.0
    regime: str = "neutral"
    entry_fee: float = 0.0
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    initial_qty: float = 0.0
    initial_stop: float = 0.0
    highest: float = 0.0
    tp1_hit: bool = False
    bars_held: int = 0
    realized: float = 0.0  # net PnL already booked by partial exits (after exit fees)
    exit_fees: float = 0.0
    fills: list[dict] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.initial_qty = self.initial_qty or self.qty
        self.initial_stop = self.initial_stop or self.stop
        self.highest = self.highest or self.entry_price

    def unrealized(self, price: float) -> float:
        return (price - self.entry_price) * self.qty

    def total_pnl(self, price: float) -> float:
        """Net PnL including the entry fee, booked partials and the open remainder."""
        return self.realized + self.unrealized(price) - self.entry_fee

    def to_dict(self, price: float | None = None) -> dict:
        d = asdict(self)
        if price is not None:
            d["price"] = price
            d["pnl"] = self.total_pnl(price)
            d["pnl_pct"] = (price / self.entry_price - 1) * 100
            d["r_multiple"] = self.total_pnl(price) / (self.initial_qty * self.risk_per_unit) if self.risk_per_unit else 0.0
            d["value"] = self.qty * price
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Position":
        keys = cls.__dataclass_fields__.keys()
        return cls(**{k: v for k, v in d.items() if k in keys})


def new_position(symbol: str, t: int, price: float, qty: float, atr: float, cfg: BotConfig, **extra) -> Position:
    risk = cfg.sl_atr_mult * atr
    return Position(
        symbol=symbol, entry_time=t, entry_price=price, qty=qty,
        stop=price - risk, tp1=price + cfg.tp1_r * risk, tp2=price + cfg.tp2_r * risk,
        risk_per_unit=risk, atr=atr, **extra,
    )


def check_exits(pos: Position, cfg: BotConfig, high: float, low: float, open_: float | None = None) -> list[tuple[str, float, float]]:
    """Intrabar exit checks. Returns [(reason, price, qty)] and mutates pos state (tp1 flag, stop).

    Conservative ordering: if a bar touches both the stop and a target the stop wins.
    """
    actions: list[tuple[str, float, float]] = []
    stop_reason = "trailing" if pos.tp1_hit and pos.stop > pos.entry_price * 1.0001 else ("breakeven" if pos.tp1_hit else "stop")
    if open_ is not None and open_ <= pos.stop:
        return [(stop_reason, open_, pos.qty)]  # gapped through the stop
    if low <= pos.stop:
        return [(stop_reason, pos.stop, pos.qty)]
    if not pos.tp1_hit and high >= pos.tp1:
        pos.tp1_hit = True
        part = pos.qty * cfg.tp1_close_pct / 100.0
        if part > 0 and part < pos.qty * 0.999:
            actions.append(("tp1", pos.tp1, part))
        elif part >= pos.qty * 0.999:
            return [("tp1", pos.tp1, pos.qty)]
        if cfg.breakeven_after_tp1:
            # Stop to entry plus round-trip costs so the rest of the trade cannot lose.
            be = pos.entry_price * (1 + 2 * (cfg.fee_pct + cfg.slippage_pct) / 100.0)
            pos.stop = max(pos.stop, be)
    remaining = pos.qty - sum(a[2] for a in actions)
    if pos.tp1_hit and remaining > 0 and high >= pos.tp2:
        actions.append(("tp2", pos.tp2, remaining))
    return actions


def on_bar_close(pos: Position, cfg: BotConfig, high: float, close: float, atr: float) -> list[tuple[str, float, float]]:
    """End-of-bar bookkeeping: trailing stop, time stop."""
    pos.bars_held += 1
    pos.highest = max(pos.highest, high)
    if atr and atr > 0:
        pos.atr = atr
    if pos.tp1_hit:
        pos.stop = max(pos.stop, pos.highest - cfg.trailing_atr_mult * pos.atr)
    if cfg.time_stop_bars and pos.bars_held >= cfg.time_stop_bars and not pos.tp1_hit:
        return [("time", close, pos.qty)]
    if cfg.time_stop_bars and pos.bars_held >= cfg.time_stop_bars * 2:
        return [("time", close, pos.qty)]
    return []


def apply_fill(pos: Position, reason: str, price: float, qty: float, fee: float, t: int) -> None:
    qty = min(qty, pos.qty)
    pos.realized += (price - pos.entry_price) * qty - fee
    pos.exit_fees += fee
    pos.qty -= qty
    if pos.qty < pos.initial_qty * 1e-6:
        pos.qty = 0.0
    pos.fills.append({"time": t, "reason": reason, "price": price, "qty": qty, "fee": fee})


def close_trade_record(pos: Position, exit_time: int) -> dict:
    exited = sum(f["qty"] for f in pos.fills) or 1e-12
    avg_exit = sum(f["price"] * f["qty"] for f in pos.fills) / exited
    pnl = pos.realized - pos.entry_fee
    reasons = [f["reason"] for f in pos.fills]
    final = reasons[-1] if reasons else "manual"
    label = EXIT_LABELS.get(final, final)
    if "tp1" in reasons and final != "tp1":
        label = f"TP1 + {label}"
    cost = pos.entry_price * pos.initial_qty
    return {
        "id": pos.id,
        "symbol": pos.symbol,
        "entry_time": pos.entry_time,
        "exit_time": exit_time,
        "entry_price": pos.entry_price,
        "exit_price": avg_exit,
        "qty": pos.initial_qty,
        "pnl": pnl,
        "pnl_pct": pnl / cost * 100 if cost else 0.0,
        "r_multiple": pnl / (pos.initial_qty * pos.risk_per_unit) if pos.risk_per_unit else 0.0,
        "fees": pos.entry_fee + pos.exit_fees,
        "exit_reason": final,
        "exit_label": label,
        "tp1_hit": pos.tp1_hit,
        "bars_held": pos.bars_held,
        "confidence": pos.confidence,
        "prob": pos.prob,
        "rule_score": pos.rule_score,
        "regime": pos.regime,
        "initial_stop": pos.initial_stop,
        "tp1": pos.tp1,
        "tp2": pos.tp2,
        "fills": pos.fills,
    }


def position_size(equity: float, cash: float, entry: float, stop: float, cfg: BotConfig, edge: float = 0.5,
                  min_notional: float = 10.0) -> float:
    """Fixed-fractional sizing: lose at most `risk_per_trade_pct` of equity if the stop is hit.

    `edge` in [0, 1] expresses how far the signal is above its threshold; with confidence sizing
    enabled the risk is scaled between 0.75x and 1.25x.
    """
    per_unit = entry - stop
    if per_unit <= 0 or entry <= 0 or equity <= 0:
        return 0.0
    risk_amt = equity * cfg.risk_per_trade_pct / 100.0
    if cfg.confidence_sizing:
        risk_amt *= 0.75 + 0.5 * min(1.0, max(0.0, edge))
    # Include costs so the realised loss at the stop stays within budget.
    cost_per_unit = entry * 2 * (cfg.fee_pct + cfg.slippage_pct) / 100.0
    qty = risk_amt / (per_unit + cost_per_unit)
    qty = min(qty, equity * cfg.max_position_pct / 100.0 / entry, cash * 0.995 / entry / (1 + cfg.fee_pct / 100.0))
    if qty * entry < min_notional:
        return 0.0
    return qty
