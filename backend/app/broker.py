"""Order execution: a paper broker (simulated fills) and a live spot broker via ccxt."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from .config import BotConfig, settings
from .market import market

log = logging.getLogger(__name__)


@dataclass
class Fill:
    price: float
    qty: float
    fee: float  # in quote currency (USDT)


class PaperBroker:
    """Fills market orders at the last price plus slippage and charges the configured fee."""

    name = "paper"

    def __init__(self, cfg: BotConfig) -> None:
        self.cfg = cfg

    def buy(self, symbol: str, qty: float, price: float) -> Fill:
        px = price * (1 + self.cfg.slippage_pct / 100)
        return Fill(px, qty, qty * px * self.cfg.fee_pct / 100)

    def sell(self, symbol: str, qty: float, price: float) -> Fill:
        px = price * (1 - self.cfg.slippage_pct / 100)
        return Fill(px, qty, qty * px * self.cfg.fee_pct / 100)

    def quote_balance(self) -> float | None:
        return None  # paper cash is tracked by the engine

    def min_notional(self, symbol: str) -> float:
        return 10.0


class LiveBroker:
    """Real spot market orders. Stops/targets are managed by the bot (software stops)."""

    name = "live"

    def __init__(self, cfg: BotConfig) -> None:
        if not settings.enable_live_trading:
            raise RuntimeError("Canlı işlem kapalı: .env dosyasında ENABLE_LIVE_TRADING=true olmalı")
        if not settings.has_exchange_keys:
            raise RuntimeError("Canlı işlem için EXCHANGE_API_KEY ve EXCHANGE_API_SECRET gerekli")
        if market.is_demo or market.active != "exchange":
            raise RuntimeError("Borsa bağlantısı yok; simülasyon verisiyle canlı işlem yapılamaz")
        self.cfg = cfg
        self.ex = market.exchange()

    def _fill(self, order: dict, fallback_price: float, symbol: str) -> Fill:
        oid = order.get("id")
        if oid and not order.get("filled"):
            try:
                order = self.ex.fetch_order(oid, symbol)
            except Exception as exc:  # some exchanges do not support fetch_order right away
                log.warning("fetch_order failed: %s", exc)
        qty = float(order.get("filled") or order.get("amount") or 0.0)
        price = float(order.get("average") or order.get("price") or fallback_price)
        fee = 0.0
        for f in order.get("fees") or ([order["fee"]] if order.get("fee") else []):
            if not f or f.get("cost") is None:
                continue
            cur = f.get("currency")
            if cur == "USDT":
                fee += float(f["cost"])
            elif cur and symbol.startswith(cur + "/"):
                fee += float(f["cost"]) * price
            else:  # e.g. paid in BNB: estimate from the configured fee rate
                fee += qty * price * self.cfg.fee_pct / 100
        if fee == 0.0:
            fee = qty * price * self.cfg.fee_pct / 100
        return Fill(price, qty, fee)

    def buy(self, symbol: str, qty: float, price: float) -> Fill:
        amount = float(self.ex.amount_to_precision(symbol, qty))
        order = self.ex.create_order(symbol, "market", "buy", amount)
        return self._fill(order, price, symbol)

    def sell(self, symbol: str, qty: float, price: float) -> Fill:
        base = symbol.split("/")[0]
        free = float(self.ex.fetch_balance().get(base, {}).get("free") or 0.0)
        amount = float(self.ex.amount_to_precision(symbol, min(qty, free)))
        if amount <= 0:
            raise RuntimeError(f"{base} bakiyesi yetersiz")
        order = self.ex.create_order(symbol, "market", "sell", amount)
        return self._fill(order, price, symbol)

    def quote_balance(self) -> float | None:
        return float(self.ex.fetch_balance().get("USDT", {}).get("free") or 0.0)

    def min_notional(self, symbol: str) -> float:
        m = self.ex.market(symbol)
        return float(((m.get("limits") or {}).get("cost") or {}).get("min") or 10.0)


def make_broker(cfg: BotConfig):
    return LiveBroker(cfg) if cfg.mode == "live" else PaperBroker(cfg)
