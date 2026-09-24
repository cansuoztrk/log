"""The live trading engine: polls market data, evaluates signals on every closed candle, manages
positions with software stops, enforces risk limits and streams state to the dashboard."""
from __future__ import annotations

import asyncio
import logging
import threading
import time
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from . import db
from .ai_model import ai_model
from .broker import LiveBroker, PaperBroker, make_broker
from .config import BotConfig, settings
from .features import CONTEXT_SYMBOL, market_context
from .fmt import num, pct, signed
from .indicators import add_indicators
from .market import closed_only, market
from .metrics import breakdowns, trade_stats
from .strategy import explain, price_digits, signal_frame
from .trading import EXIT_LABELS, Position, apply_fill, check_exits, close_trade_record, new_position, on_bar_close, position_size

log = logging.getLogger(__name__)
EQUITY_EVERY_SEC = 300


def _day_key(ts: float | None = None) -> str:
    return datetime.fromtimestamp(ts or time.time(), tz=timezone.utc).strftime("%Y-%m-%d")


class Engine:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.loop: asyncio.AbstractEventLoop | None = None
        self.subscribers: set[asyncio.Queue] = set()
        self.cfg = BotConfig()
        self.broker = None
        self.running = False
        self.halted = False
        self.halt_reason = ""
        self.positions: dict[str, Position] = {}
        self.cash = 0.0
        self.peak = 0.0
        self.day = _day_key()
        self.day_start_equity = 0.0
        self.start_equity = 0.0
        self.frames: dict[str, pd.DataFrame] = {}
        self.signals: dict[str, dict] = {}
        self.sig_frames: dict[str, pd.DataFrame] = {}
        self.prices: dict[str, float] = {}
        self.last_bar: dict[str, int] = {}
        self.last_loss_bar: dict[str, int] = {}
        self.last_tick = 0.0
        self.last_error = ""
        self.broker_error = ""
        self.last_equity_save = 0.0
        self.last_balance_sync = 0.0
        self.tick_count = 0
        self._stats_cache: dict | None = None
        self._task: asyncio.Task | None = None
        self._training_thread: threading.Thread | None = None
        self.analyses: dict[str, dict] = {}

    # ------------------------------------------------------------------------------------------
    # lifecycle
    # ------------------------------------------------------------------------------------------
    def load(self) -> None:
        db.init()
        saved = db.kv_get("config")
        if saved:
            try:
                self.cfg = BotConfig(**saved)
            except Exception as exc:
                log.warning("Saved config invalid, using defaults: %s", exc)
        if self.cfg.mode == "live" and not settings.enable_live_trading:
            self.cfg = self.cfg.model_copy(update={"mode": "paper"})
        self._load_account()
        self.running = bool(db.kv_get(f"running_{self.cfg.mode}", False)) and self.cfg.mode == "paper"

    def _load_account(self) -> None:
        mode = self.cfg.mode
        self.positions = {p["symbol"]: Position.from_dict(p) for p in db.kv_get(f"positions_{mode}", [])}
        acct = db.kv_get(f"account_{mode}") or {}
        if mode == "paper":
            self.cash = float(acct.get("cash", self.cfg.paper_starting_balance))
            self.start_equity = float(acct.get("start_equity", self.cfg.paper_starting_balance))
        else:
            self.cash = float(acct.get("cash", 0.0))
            self.start_equity = float(acct.get("start_equity", 0.0))
        self.peak = float(acct.get("peak", self.start_equity))
        self.day = acct.get("day", _day_key())
        self.day_start_equity = float(acct.get("day_start_equity", self.start_equity))
        self.halted = bool(acct.get("halted", False))
        self.halt_reason = acct.get("halt_reason", "")
        self._stats_cache = None
        try:
            self.broker = make_broker(self.cfg)
            self.broker_error = ""
        except Exception as exc:
            self.broker = None
            self.broker_error = str(exc)

    def _save_account(self) -> None:
        mode = self.cfg.mode
        db.kv_set(f"positions_{mode}", [p.to_dict() for p in self.positions.values()])
        db.kv_set(f"account_{mode}", {
            "cash": self.cash, "start_equity": self.start_equity, "peak": self.peak, "day": self.day,
            "day_start_equity": self.day_start_equity, "halted": self.halted, "halt_reason": self.halt_reason,
        })

    async def start(self) -> None:
        self.loop = asyncio.get_running_loop()
        await asyncio.to_thread(market.probe)
        self.event("info", "system", f"Veri kaynağı: {'Borsa (' + settings.exchange + ')' if market.active == 'exchange' else 'Simülasyon'}")
        if market.last_error:
            self.event("warning", "system", f"Borsaya bağlanılamadı, simülasyon verisi kullanılıyor: {market.last_error[:160]}")
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()

    async def _run(self) -> None:
        while True:
            started = time.time()
            try:
                await asyncio.to_thread(self._tick)
            except Exception as exc:  # keep the loop alive whatever happens
                log.exception("tick failed")
                self.last_error = f"{type(exc).__name__}: {exc}"[:300]
                self.event("error", "system", f"Döngü hatası: {self.last_error}")
            self._maybe_retrain()
            await self.broadcast({"type": "state", "data": self.snapshot()})
            await asyncio.sleep(max(1.0, self.cfg.poll_interval_sec - (time.time() - started)))

    # ------------------------------------------------------------------------------------------
    # events / websocket
    # ------------------------------------------------------------------------------------------
    def event(self, level: str, kind: str, message: str, data: dict | None = None) -> None:
        ev = db.add_event(level, kind, message, data)
        log.info("[%s] %s", kind, message)
        self._push({"type": "event", "data": ev})

    def _push(self, msg: dict) -> None:
        if not self.loop:
            return
        for q in list(self.subscribers):
            try:
                self.loop.call_soon_threadsafe(q.put_nowait, msg)
            except RuntimeError:
                pass

    async def broadcast(self, msg: dict) -> None:
        for q in list(self.subscribers):
            if q.qsize() < 50:
                q.put_nowait(msg)

    # ------------------------------------------------------------------------------------------
    # market data
    # ------------------------------------------------------------------------------------------
    def model_for_cfg(self):
        m = ai_model
        if not m.ready or m.meta.get("timeframe") != self.cfg.timeframe:
            return None
        return m

    def _fetch(self, symbol: str) -> pd.DataFrame:
        tf = self.cfg.tf_seconds
        cached = self.frames.get(symbol)
        now = time.time()
        if cached is not None and len(cached) >= 300 and int(cached["time"].iloc[-1]) + tf > now:
            fresh = market.ohlcv(symbol, self.cfg.timeframe, limit=3)
            merged = pd.concat([cached, fresh]).drop_duplicates("time", keep="last").sort_values("time")
            return merged.iloc[-600:].reset_index(drop=True)
        return market.ohlcv(symbol, self.cfg.timeframe, limit=600)

    def watched(self) -> list[str]:
        syms = list(dict.fromkeys([*self.cfg.symbols, *self.positions.keys()]))
        return syms

    def context(self) -> pd.DataFrame | None:
        btc = self.frames.get(CONTEXT_SYMBOL)
        if btc is None:
            return None
        return market_context(add_indicators(closed_only(btc, self.cfg.timeframe)))

    # ------------------------------------------------------------------------------------------
    # the tick
    # ------------------------------------------------------------------------------------------
    def _tick(self) -> None:
        symbols = self.watched()
        fetch = list(dict.fromkeys([CONTEXT_SYMBOL, *symbols]))
        fetched: dict[str, pd.DataFrame] = {}
        errors: list[str] = []
        for sym in fetch:
            try:
                fetched[sym] = self._fetch(sym)
            except Exception as exc:
                errors.append(f"{sym}: {type(exc).__name__}: {exc}"[:200])
                log.warning("fetch %s failed: %s", sym, exc)

        with self.lock:
            now = time.time()
            self.frames.update(fetched)
            for sym, df in fetched.items():
                if len(df):
                    self.prices[sym] = float(df["close"].iloc[-1])
            self._sync_live_balance(now)
            self._roll_day(now)
            ctx = self.context()
            model = self.model_for_cfg()
            for sym in symbols:
                if sym not in fetched:
                    continue
                self._process_symbol(sym, fetched[sym], ctx, model, now)
            self._risk_checks()
            self.last_error = "; ".join(errors)
            self.last_tick = now
            self.tick_count += 1
            if now - self.last_equity_save >= EQUITY_EVERY_SEC:
                db.add_equity(self.cfg.mode, self.equity(), self.cash)
                self.last_equity_save = now
            self._save_account()

    def _process_symbol(self, sym: str, raw: pd.DataFrame, ctx, model, now: float) -> None:
        tf = self.cfg.tf_seconds
        closed = closed_only(raw, self.cfg.timeframe, now)
        if len(closed) < 210:
            return
        bar_t = int(closed["time"].iloc[-1])
        price = self.prices[sym]
        pos = self.positions.get(sym)

        new_bar = self.last_bar.get(sym) != bar_t
        if new_bar or sym not in self.signals:
            ind = add_indicators(closed)
            sig = signal_frame(ind, self.cfg, model, ctx)
            self.sig_frames[sym] = sig
            info = explain(sym, ind, sig, self.cfg, model)
            info["bar_close"] = bar_t + tf
            info["next_close"] = bar_t + 2 * tf
            prev_action = self.signals.get(sym, {}).get("action")
            self.signals[sym] = info
            first_eval = sym not in self.last_bar
            self.last_bar[sym] = bar_t

            if pos is not None and not first_eval:
                last = closed.iloc[-1]
                # A position opened during this bar must not inherit highs printed before its entry.
                high = float(last["high"]) if pos.entry_time <= bar_t else max(pos.highest, price)
                for reason, px, qty in on_bar_close(pos, self.cfg, high, float(last["close"]), float(ind["atr"].iloc[-1])):
                    self._exit(sym, reason, price, qty)
                pos = self.positions.get(sym)
                if pos is not None and self.cfg.exit_on_signal_reversal and info["action"] == "EXIT":
                    self._exit(sym, "signal", price, pos.qty)
                    pos = None

            if info["action"] == "BUY" and prev_action != "BUY" and not first_eval:
                prob_txt = pct(info["prob"] * 100) if info["prob"] is not None else "kural tabanlı"
                self.event("signal", "signal", f"AL sinyali: {sym} — olasılık {prob_txt} · güven {pct(info['confidence'] * 100, 0)}",
                           {"symbol": sym})
            # Enter only on a fresh bar close (never chase a stale signal after a restart).
            fresh = now - (bar_t + tf) <= max(tf * 0.25, 3 * self.cfg.poll_interval_sec)
            if info["action"] == "BUY" and pos is None and self.running and fresh:
                self._try_enter(sym, info, price, bar_t)
        else:
            self.signals[sym]["price"] = price

        pos = self.positions.get(sym)
        if pos is not None:
            for reason, px, qty in check_exits(pos, self.cfg, price, price):
                self._exit(sym, reason, price, qty)
                if sym not in self.positions:
                    break

    # ------------------------------------------------------------------------------------------
    # orders
    # ------------------------------------------------------------------------------------------
    def equity(self) -> float:
        return self.cash + sum(p.qty * self.prices.get(s, p.entry_price) for s, p in self.positions.items())

    def _entry_block_reason(self, sym: str, bar_t: int | None) -> str | None:
        if self.broker is None:
            return f"Emir sistemi hazır değil: {self.broker_error}"
        if self.halted:
            return f"Bot acil durumda durduruldu: {self.halt_reason}"
        if sym in self.positions:
            return "Bu sembolde zaten açık pozisyon var"
        if len(self.positions) >= self.cfg.max_open_positions:
            return f"Maksimum açık pozisyon sayısına ({self.cfg.max_open_positions}) ulaşıldı"
        eq = self.equity()
        if self.day_start_equity and eq < self.day_start_equity * (1 - self.cfg.daily_loss_limit_pct / 100):
            return f"Günlük zarar limiti ({pct(self.cfg.daily_loss_limit_pct)}) aşıldı, yarın devam edilecek"
        lb = self.last_loss_bar.get(sym)
        if bar_t is not None and lb is not None and (bar_t - lb) / self.cfg.tf_seconds <= self.cfg.cooldown_bars:
            return f"Zarardan sonra bekleme süresi ({self.cfg.cooldown_bars} mum)"
        return None

    def _try_enter(self, sym: str, info: dict, price: float, bar_t: int | None, manual: bool = False) -> dict | None:
        reason = self._entry_block_reason(sym, None if manual else bar_t)
        if reason:
            if manual:
                raise ValueError(reason)
            self.event("info", "risk", f"{sym} sinyali atlandı: {reason}", {"symbol": sym})
            return None
        atr = float(info["indicators"]["atr"])
        stop = price - self.cfg.sl_atr_mult * atr
        thr = info["threshold"]
        edge = ((info["prob"] - thr) / max(1e-6, 1 - thr)) if info["prob"] is not None and thr <= 1 else (info["confidence"] - 0.5) * 2
        if self.cfg.mode == "live":
            bal = self.broker.quote_balance()
            if bal is not None:
                self.cash = bal
        qty = position_size(self.equity(), self.cash, price, stop, self.cfg, edge, self.broker.min_notional(sym))
        if qty <= 0:
            msg = "Pozisyon büyüklüğü minimum işlem tutarının altında (bakiye yetersiz)"
            if manual:
                raise ValueError(msg)
            self.event("warning", "risk", f"{sym}: {msg}", {"symbol": sym})
            return None
        try:
            fill = self.broker.buy(sym, qty, price)
        except Exception as exc:
            self.event("error", "order", f"{sym} alış emri başarısız: {exc}", {"symbol": sym})
            if manual:
                raise
            return None
        self.cash -= fill.qty * fill.price + fill.fee
        pos = new_position(
            sym, int(time.time()), fill.price, fill.qty, atr, self.cfg, entry_fee=fill.fee,
            confidence=float(info["confidence"]), prob=info["prob"], rule_score=float(info["rule_score"]), regime=info["regime"],
        )
        self.positions[sym] = pos
        self._stats_cache = None
        d = price_digits(fill.price)
        self.event("success", "trade", f"{'Manuel ' if manual else ''}ALIŞ {sym}: {num(fill.qty, 6 if fill.qty < 1 else 4)} @ {num(fill.price, d)} · "
                   f"SL {num(pos.stop, d)} · TP1 {num(pos.tp1, d)} · TP2 {num(pos.tp2, d)}", {"symbol": sym, "position": pos.to_dict()})
        self._save_account()
        return pos.to_dict(fill.price)

    def _exit(self, sym: str, reason: str, price: float, qty: float) -> None:
        pos = self.positions.get(sym)
        if pos is None or qty <= 0:
            return
        try:
            fill = self.broker.sell(sym, qty, price)
        except Exception as exc:
            self.event("error", "order", f"{sym} satış emri başarısız ({EXIT_LABELS.get(reason, reason)}): {exc}", {"symbol": sym})
            return
        self.cash += fill.qty * fill.price - fill.fee
        apply_fill(pos, reason, fill.price, fill.qty, fill.fee, int(time.time()))
        if reason != "tp1" and 0 < pos.qty and pos.qty * fill.price < self.broker.min_notional(sym):
            pos.qty = 0.0  # unsellable dust left by exchange rounding / fees paid in the coin
        d = price_digits(fill.price)
        if pos.qty <= 0:
            rec = close_trade_record(pos, int(time.time()))
            del self.positions[sym]
            db.add_trade(self.cfg.mode, rec)
            self._stats_cache = None
            if rec["pnl"] <= 0:
                self.last_loss_bar[sym] = self.last_bar.get(sym, 0)
            level = "success" if rec["pnl"] > 0 else "warning"
            self.event(level, "trade", f"KAPANDI {sym} ({rec['exit_label']}): {signed(rec['pnl'])} USDT "
                       f"({pct(rec['pnl_pct'], 2, sign=True)} · {signed(rec['r_multiple'])}R)", {"symbol": sym, "trade": rec})
        else:
            self.event("success", "trade", f"{EXIT_LABELS.get(reason, reason)} {sym}: {num(fill.qty, 6 if fill.qty < 1 else 4)} @ {num(fill.price, d)} · "
                       f"stop {'başabaşa çekildi' if self.cfg.breakeven_after_tp1 else 'korunuyor'} ({num(pos.stop, d)})", {"symbol": sym})
        self._save_account()

    # ------------------------------------------------------------------------------------------
    # risk
    # ------------------------------------------------------------------------------------------
    def _sync_live_balance(self, now: float) -> None:
        if self.cfg.mode != "live" or self.broker is None or now - self.last_balance_sync < 60:
            return
        try:
            bal = self.broker.quote_balance()
            if bal is not None:
                self.cash = bal
            self.last_balance_sync = now
        except Exception as exc:
            log.warning("balance sync failed: %s", exc)

    def _roll_day(self, now: float) -> None:
        key = _day_key(now)
        if key != self.day:
            self.day = key
            self.day_start_equity = self.equity()

    def _risk_checks(self) -> None:
        eq = self.equity()
        if self.start_equity <= 0 and eq > 0:
            self.start_equity = self.peak = self.day_start_equity = eq
        self.peak = max(self.peak, eq)
        if self.peak > 0 and eq < self.peak * (1 - self.cfg.max_drawdown_pct / 100) and not self.halted:
            self.halted = True
            self.halt_reason = f"Maksimum düşüş limiti ({pct(self.cfg.max_drawdown_pct)}) aşıldı"
            self.running = False
            db.kv_set(f"running_{self.cfg.mode}", False)
            for sym in list(self.positions):
                self._exit(sym, "kill", self.prices.get(sym, self.positions[sym].entry_price), self.positions[sym].qty)
            self.event("critical", "risk", f"ACİL DURDURMA: {self.halt_reason}. Tüm pozisyonlar kapatıldı, bot durduruldu.")

    # ------------------------------------------------------------------------------------------
    # commands (called from the API)
    # ------------------------------------------------------------------------------------------
    def set_running(self, on: bool) -> None:
        with self.lock:
            if on:
                if self.broker is None:
                    raise ValueError(f"Emir sistemi hazır değil: {self.broker_error}")
                if self.halted:
                    raise ValueError("Bot acil durdurma durumunda. Önce 'Acil durumu sıfırla' ile onaylayın.")
                if self.cfg.mode == "live" and market.is_demo:
                    raise ValueError("Simülasyon verisiyle canlı işlem başlatılamaz")
            self.running = on
            db.kv_set(f"running_{self.cfg.mode}", on)
        mode = "CANLI" if self.cfg.mode == "live" else "PAPER"
        self.event("info" if on else "warning", "system", f"Otomatik işlem {'BAŞLATILDI' if on else 'DURDURULDU'} ({mode})")

    def reset_halt(self) -> None:
        with self.lock:
            self.halted = False
            self.halt_reason = ""
            self.peak = self.equity()
            self._save_account()
        self.event("info", "risk", "Acil durdurma sıfırlandı; zirve bakiye güncellendi")

    def update_config(self, new: BotConfig) -> BotConfig:
        with self.lock:
            old = self.cfg
            if new.mode == "live" and old.mode != "live":
                if not settings.enable_live_trading:
                    raise ValueError("Canlı mod kapalı. .env dosyasında ENABLE_LIVE_TRADING=true yapıp uygulamayı yeniden başlatın.")
                try:
                    LiveBroker(new)
                except RuntimeError as exc:
                    raise ValueError(str(exc)) from exc
            if new.mode != old.mode:
                if self.running:
                    raise ValueError("Mod değiştirmeden önce otomatik işlemi durdurun")
                self._save_account()
            self.cfg = new
            db.kv_set("config", new.model_dump())
            if new.mode != old.mode:
                self._load_account()
            else:
                try:
                    self.broker = make_broker(new)
                    self.broker_error = ""
                except Exception as exc:
                    self.broker, self.broker_error = None, str(exc)
            if new.timeframe != old.timeframe:
                self.frames.clear()
                self.signals.clear()
                self.sig_frames.clear()
                self.last_bar.clear()
            elif new.model_dump(exclude={"mode"}) != old.model_dump(exclude={"mode"}):
                self.last_bar.clear()  # recompute signals with the new parameters on the next tick
        self.event("info", "config", "Ayarlar güncellendi")
        return self.cfg

    def close_position(self, sym: str, reason: str = "manual") -> None:
        with self.lock:
            pos = self.positions.get(sym)
            if pos is None:
                raise ValueError("Açık pozisyon yok")
            price = self.prices.get(sym) or market.price(sym)
            self._exit(sym, reason, price, pos.qty)
            if sym in self.positions:
                raise ValueError("Satış emri gerçekleşmedi, olay günlüğüne bakın")

    def manual_buy(self, sym: str) -> dict:
        with self.lock:
            info = self.signals.get(sym)
            if info is None:
                raise ValueError("Bu sembol için henüz sinyal hesaplanmadı")
            price = self.prices.get(sym) or info["price"]
            return self._try_enter(sym, info, price, None, manual=True)

    def reset_paper(self, balance: float | None = None) -> None:
        with self.lock:
            if self.cfg.mode != "paper":
                raise ValueError("Yalnızca paper modda sıfırlanabilir")
            bal = balance or self.cfg.paper_starting_balance
            if balance:
                self.cfg = self.cfg.model_copy(update={"paper_starting_balance": bal})
                db.kv_set("config", self.cfg.model_dump())
            self.positions.clear()
            self.cash = self.start_equity = self.peak = self.day_start_equity = bal
            self.halted, self.halt_reason = False, ""
            self.last_loss_bar.clear()
            db.clear_mode("paper")
            db.add_equity("paper", bal, bal)
            self._stats_cache = None
            self._save_account()
        self.event("info", "system", f"Paper hesap sıfırlandı: {num(bal)} USDT")

    # ------------------------------------------------------------------------------------------
    # model training
    # ------------------------------------------------------------------------------------------
    def train_async(self, reason: str = "manual") -> bool:
        if self._training_thread and self._training_thread.is_alive():
            return False
        cfg = self.cfg

        def job():
            try:
                self.event("info", "model", f"AI modeli eğitimi başladı ({cfg.timeframe}, {cfg.train_days} gün, {len(cfg.symbols)} sembol)")
                ai_model.status.state, ai_model.status.message, ai_model.status.progress = "running", "Geçmiş veriler indiriliyor", 0.01
                frames = {}
                for i, s in enumerate(cfg.symbols):
                    ai_model.status.message = f"Geçmiş veri indiriliyor: {s}"
                    frames[s] = market.history(s, cfg.timeframe, cfg.train_days)
                    ai_model.status.progress = 0.01 + 0.04 * (i + 1) / len(cfg.symbols)
                context = frames.get(CONTEXT_SYMBOL)
                if context is None:
                    context = market.history(CONTEXT_SYMBOL, cfg.timeframe, cfg.train_days)
                meta = ai_model.train(frames, cfg, context)
                sm = meta["summary"]
                wr = sm.get("pooled_win_rate")
                q = {"strong": "güçlü", "weak": "zayıf", "none": "yok"}[meta["quality"]]
                thr_txt = "kapalı (avantaj yok)" if meta["threshold"] > 1 else num(meta["threshold"], 2)
                self.event("success" if meta["has_edge"] else "warning", "model",
                           f"Model eğitildi · avantaj: {q} · OOS kazanma oranı {pct(wr * 100) if wr is not None else '-'} · eşik {thr_txt}")
                with self.lock:
                    self.last_bar.clear()  # recompute signals with the new model on the next tick
            except Exception as exc:
                log.exception("training failed")
                self.event("error", "model", f"Model eğitimi başarısız: {exc}")

        self._training_thread = threading.Thread(target=job, daemon=True, name=f"train-{reason}")
        self._training_thread.start()
        return True

    def _maybe_retrain(self) -> None:
        if self.cfg.auto_retrain_hours <= 0 or (self._training_thread and self._training_thread.is_alive()):
            return
        if self.cfg.strategy_mode != "ai":
            return
        meta = ai_model.meta
        if not ai_model.ready or meta.get("timeframe") != self.cfg.timeframe:
            if ai_model.status.state != "error" or time.time() - (ai_model.status.finished_at or 0) > 3600:
                self.train_async("auto-initial")
            return
        if time.time() - meta.get("trained_at", 0) > self.cfg.auto_retrain_hours * 3600:
            self.train_async("auto-periodic")

    # ------------------------------------------------------------------------------------------
    # read models for the API
    # ------------------------------------------------------------------------------------------
    def stats(self) -> dict:
        if self._stats_cache is None:
            trades = db.trades(self.cfg.mode)
            s = trade_stats(list(reversed(trades)))
            s["breakdowns"] = breakdowns(trades) if trades else None
            self._stats_cache = s
        return self._stats_cache

    def model_info(self) -> dict:
        m = ai_model
        st = m.status
        meta = m.meta or {}
        stale = []
        if m.ready:
            if meta.get("timeframe") != self.cfg.timeframe:
                stale.append(f"Model {meta.get('timeframe')} için eğitildi, bot {self.cfg.timeframe} kullanıyor")
            if meta.get("sl_atr_mult") != self.cfg.sl_atr_mult or meta.get("tp1_r") != self.cfg.tp1_r:
                stale.append("Stop/TP1 ayarları eğitimden sonra değişti")
            if set(meta.get("symbols", [])) != set(self.cfg.symbols):
                stale.append("Sembol listesi eğitimden sonra değişti")
        return {
            "ready": m.ready,
            "usable": self.model_for_cfg() is not None,
            "threshold": m.threshold if m.ready else None,
            "quality": meta.get("quality"),
            "has_edge": meta.get("has_edge"),
            "trained_at": meta.get("trained_at"),
            "summary": meta.get("summary"),
            "stale": stale,
            "training": {"state": st.state, "progress": st.progress, "message": st.message,
                         "started_at": st.started_at, "finished_at": st.finished_at},
        }

    def snapshot(self) -> dict:
        with self.lock:
            eq = self.equity()
            invested = sum(p.qty * self.prices.get(s, p.entry_price) for s, p in self.positions.items())
            unreal = sum(p.total_pnl(self.prices.get(s, p.entry_price)) for s, p in self.positions.items())
            positions = []
            for s, p in self.positions.items():
                price = self.prices.get(s, p.entry_price)
                d = p.to_dict(price)
                d["price_digits"] = price_digits(price)
                d.pop("fills", None)
                positions.append(d)
            signals = []
            for s in self.cfg.symbols:
                info = self.signals.get(s)
                if not info:
                    continue
                signals.append({k: info[k] for k in ("symbol", "price", "price_digits", "action", "prob", "threshold", "confidence",
                                                      "rule_score", "regime", "regime_label", "time", "next_close")}
                               | {"change_24": info["indicators"]["change_24"], "rsi": info["indicators"]["rsi"],
                                  "in_position": s in self.positions})
            st = self.stats()
            return {
                "server_time": time.time(),
                "status": {
                    "running": self.running,
                    "halted": self.halted,
                    "halt_reason": self.halt_reason,
                    "mode": self.cfg.mode,
                    "timeframe": self.cfg.timeframe,
                    "strategy_mode": self.cfg.strategy_mode,
                    "data_source": market.active,
                    "data_error": market.last_error,
                    "exchange": settings.exchange,
                    "live_enabled": settings.enable_live_trading,
                    "has_keys": settings.has_exchange_keys,
                    "has_ai_analyst": settings.has_anthropic,
                    "last_tick": self.last_tick,
                    "last_error": self.last_error,
                    "poll_interval": self.cfg.poll_interval_sec,
                    "broker_ready": self.broker is not None,
                    "broker_error": self.broker_error,
                },
                "account": {
                    "equity": eq,
                    "cash": self.cash,
                    "invested": invested,
                    "unrealized": unreal,
                    "start_equity": self.start_equity,
                    "total_pnl": eq - self.start_equity if self.start_equity else 0.0,
                    "total_pnl_pct": (eq / self.start_equity - 1) * 100 if self.start_equity else 0.0,
                    "day_pnl": eq - self.day_start_equity if self.day_start_equity else 0.0,
                    "day_pnl_pct": (eq / self.day_start_equity - 1) * 100 if self.day_start_equity else 0.0,
                    "peak": self.peak,
                    "drawdown_pct": (eq / self.peak - 1) * 100 if self.peak else 0.0,
                    "exposure_pct": invested / eq * 100 if eq else 0.0,
                },
                "positions": positions,
                "signals": signals,
                "model": self.model_info(),
                "stats": {k: v for k, v in st.items() if k != "breakdowns"},
            }


engine = Engine()


def clean(obj):
    """Make a structure JSON-safe (NaN/inf -> None, numpy scalars -> python)."""
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean(v) for v in obj]
    if isinstance(obj, (np.floating, float)):
        f = float(obj)
        return None if np.isnan(f) or np.isinf(f) else f
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj
