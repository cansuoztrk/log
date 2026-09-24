"""HTTP + WebSocket API and static hosting of the dashboard."""
from __future__ import annotations

import asyncio
import hmac
import json
import logging
import logging.handlers
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError

from . import analyst, db
from .ai_model import AIModel, ai_model
from .backtest import run_backtest
from .config import TIMEFRAMES, BotConfig, settings
from .engine import clean, engine
from .features import CONTEXT_SYMBOL
from .indicators import add_indicators
from .market import closed_only, market
from .metrics import breakdowns, monthly_returns, trade_stats
from .strategy import explain, signal_frame

LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
_file_log = logging.handlers.RotatingFileHandler(settings.data_dir / "bot.log", maxBytes=2_000_000, backupCount=3, encoding="utf-8")
_file_log.setFormatter(logging.Formatter(LOG_FORMAT))
logging.getLogger().addHandler(_file_log)
log = logging.getLogger("app")


class SafeJSON(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(clean(content), ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")


@asynccontextmanager
async def lifespan(_: FastAPI):
    engine.load()
    await engine.start()
    yield
    await engine.stop()


app = FastAPI(title="AI Kripto Bot", default_response_class=SafeJSON, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])


def _token_ok(token: str | None) -> bool:
    if not settings.dashboard_token:
        return True
    return bool(token) and hmac.compare_digest(token, settings.dashboard_token)


def auth(request: Request) -> None:
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else request.query_params.get("token")
    if not _token_ok(token):
        raise HTTPException(401, "Yetkisiz: geçerli erişim anahtarı gerekli")


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return SafeJSON({"detail": str(exc)}, status_code=400)


@app.exception_handler(ValidationError)
async def validation_error_handler(_: Request, exc: ValidationError):
    msgs = [f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()]
    return SafeJSON({"detail": "; ".join(msgs)}, status_code=422)


# ------------------------------------------------------------------------------------------------
# status & config
# ------------------------------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"ok": True, "time": time.time()}


@app.get("/api/auth")
def auth_info(request: Request):
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else None
    return {"required": bool(settings.dashboard_token), "ok": _token_ok(token)}


@app.get("/api/state", dependencies=[Depends(auth)])
def state():
    return engine.snapshot()


@app.post("/api/bot/start", dependencies=[Depends(auth)])
def bot_start():
    engine.set_running(True)
    return engine.snapshot()


@app.post("/api/bot/stop", dependencies=[Depends(auth)])
def bot_stop():
    engine.set_running(False)
    return engine.snapshot()


@app.post("/api/bot/reset-halt", dependencies=[Depends(auth)])
def bot_reset_halt():
    engine.reset_halt()
    return engine.snapshot()


@app.get("/api/config", dependencies=[Depends(auth)])
def get_config():
    return {"config": engine.cfg.model_dump(), "timeframes": TIMEFRAMES, "defaults": BotConfig().model_dump(),
            "live_enabled": settings.enable_live_trading, "has_keys": settings.has_exchange_keys}


@app.put("/api/config", dependencies=[Depends(auth)])
def put_config(body: dict):
    merged = {**engine.cfg.model_dump(), **body}
    cfg = BotConfig(**merged)
    return {"config": engine.update_config(cfg).model_dump()}


@app.get("/api/markets", dependencies=[Depends(auth)])
def markets():
    return {"markets": market.markets()}


# ------------------------------------------------------------------------------------------------
# market views
# ------------------------------------------------------------------------------------------------
def _series(ind: pd.DataFrame, col: str) -> list[dict]:
    s = ind[["time", col]].dropna()
    return [{"time": int(t), "value": float(v)} for t, v in zip(s["time"], s[col])]


@app.get("/api/signal", dependencies=[Depends(auth)])
def signal(symbol: str):
    info = engine.signals.get(symbol)
    if info is None:
        raw = market.ohlcv(symbol, engine.cfg.timeframe, 600)
        ind = add_indicators(closed_only(raw, engine.cfg.timeframe))
        model = engine.model_for_cfg()
        info = explain(symbol, ind, signal_frame(ind, engine.cfg, model, engine.context()), engine.cfg, model)
    pos = engine.positions.get(symbol)
    return {**info, "position": pos.to_dict(engine.prices.get(symbol, pos.entry_price)) if pos else None,
            "analysis": analyst._cache.get((symbol, int(info["time"])))}


@app.get("/api/candles", dependencies=[Depends(auth)])
def candles(symbol: str, limit: int = Query(400, ge=50, le=1000)):
    tf = engine.cfg.timeframe
    raw = engine.frames.get(symbol)
    if raw is None or len(raw) < 50:
        raw = market.ohlcv(symbol, tf, 600)
    raw = raw.iloc[-(limit + 250):].reset_index(drop=True)
    ind = add_indicators(raw)
    closed = closed_only(raw, tf)
    view = ind.iloc[-limit:]
    first = int(view["time"].iloc[0])

    sig = engine.sig_frames.get(symbol)
    signal_markers = []
    if sig is not None and len(sig) == len(closed_only(engine.frames.get(symbol, raw), tf)):
        times = closed_only(engine.frames[symbol], tf)["time"].to_numpy()
        for t, buy, p in zip(times, sig["buy"].to_numpy(), sig["prob"].to_numpy()):
            if buy and t >= first:
                signal_markers.append({"time": int(t), "prob": None if pd.isna(p) else float(p)})
    trades = [t for t in db.trades(engine.cfg.mode, limit=500, symbol=symbol) if t["exit_time"] >= first]
    pos = engine.positions.get(symbol)
    return {
        "symbol": symbol,
        "timeframe": tf,
        "candles": [{"time": int(r.time), "open": r.open, "high": r.high, "low": r.low, "close": r.close, "volume": r.volume}
                    for r in view[["time", "open", "high", "low", "close", "volume"]].itertuples(index=False)],
        "overlays": {k: _series(view, k) for k in ("ema20", "ema50", "ema200", "bb_upper", "bb_mid", "bb_lower", "vwap", "st_line")},
        "st_dir": _series(view, "st_dir"),
        "rsi": _series(view, "rsi"),
        "macd": {"macd": _series(view, "macd"), "signal": _series(view, "macd_signal"), "hist": _series(view, "macd_hist")},
        "signals": signal_markers,
        "trades": [{k: t[k] for k in ("id", "entry_time", "exit_time", "entry_price", "exit_price", "pnl", "exit_label", "r_multiple")}
                   for t in trades],
        "position": pos.to_dict(engine.prices.get(symbol, pos.entry_price)) if pos else None,
        "forming": int(raw["time"].iloc[-1]) if len(closed) < len(raw) else None,
    }


# ------------------------------------------------------------------------------------------------
# trading
# ------------------------------------------------------------------------------------------------
class SymbolBody(BaseModel):
    symbol: str


@app.post("/api/positions/close", dependencies=[Depends(auth)])
def close_position(body: SymbolBody):
    engine.close_position(body.symbol)
    return engine.snapshot()


@app.post("/api/positions/open", dependencies=[Depends(auth)])
def open_position(body: SymbolBody):
    engine.manual_buy(body.symbol)
    return engine.snapshot()


class ResetBody(BaseModel):
    balance: float | None = Field(None, gt=0)


@app.post("/api/paper/reset", dependencies=[Depends(auth)])
def reset_paper(body: ResetBody):
    engine.reset_paper(body.balance)
    return engine.snapshot()


@app.get("/api/trades", dependencies=[Depends(auth)])
def trades(limit: int = Query(500, ge=1, le=5000), symbol: str | None = None):
    rows = db.trades(engine.cfg.mode, limit=limit, symbol=symbol)
    for r in rows:
        r.pop("fills", None)
    return {"trades": rows}


@app.get("/api/performance", dependencies=[Depends(auth)])
def performance(days: int = Query(0, ge=0, le=3650)):
    since = int(time.time() - days * 86400) if days else 0
    rows = db.trades(engine.cfg.mode, since=since or None)
    eq = db.equity_curve(engine.cfg.mode, since)
    return {
        "stats": trade_stats(list(reversed(rows))),
        "breakdowns": breakdowns(rows) if rows else None,
        "equity": eq,
        "monthly": monthly_returns([e["time"] for e in eq], [e["equity"] for e in eq]),
    }


@app.get("/api/events", dependencies=[Depends(auth)])
def events(limit: int = Query(200, ge=1, le=1000)):
    return {"events": db.events(limit)}


# ------------------------------------------------------------------------------------------------
# AI model
# ------------------------------------------------------------------------------------------------
@app.get("/api/model", dependencies=[Depends(auth)])
def model():
    return {**engine.model_info(), "meta": ai_model.meta}


@app.post("/api/model/train", dependencies=[Depends(auth)])
def model_train():
    if not engine.train_async("manual"):
        raise HTTPException(409, "Eğitim zaten devam ediyor")
    return engine.model_info()


class AnalyzeBody(BaseModel):
    symbol: str


@app.post("/api/analyze", dependencies=[Depends(auth)])
def analyze(body: AnalyzeBody):
    info = engine.signals.get(body.symbol)
    if info is None:
        raise ValueError("Bu sembol için henüz sinyal yok")
    raw = engine.frames.get(body.symbol)
    candles_short = []
    if raw is not None:
        tail = closed_only(raw, engine.cfg.timeframe).iloc[-40:]
        candles_short = [{"t": int(r.time), "o": r.open, "h": r.high, "l": r.low, "c": r.close, "v": round(r.volume, 2)}
                         for r in tail.itertuples(index=False)]
    pos = engine.positions.get(body.symbol)
    try:
        return analyst.analyze(body.symbol, engine.cfg.timeframe, info, candles_short,
                               pos.to_dict(engine.prices.get(body.symbol)) if pos else None, ai_model.meta or {})
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


# ------------------------------------------------------------------------------------------------
# backtests
# ------------------------------------------------------------------------------------------------
class BacktestBody(BaseModel):
    symbols: list[str] | None = None
    timeframe: str | None = None
    days: int = Field(180, ge=14, le=1500)
    ai_mode: Literal["oos", "current", "rules"] = "oos"
    initial_balance: float = Field(10_000.0, gt=0)
    overrides: dict = Field(default_factory=dict)


JOBS: dict[str, dict] = {}


def _backtest_job(job_id: str, body: BacktestBody, cfg: BotConfig) -> None:
    job = JOBS[job_id]
    try:
        warmup_days = int(300 * cfg.tf_seconds / 86400) + 2
        hist_days = body.days + warmup_days + (cfg.train_days if body.ai_mode == "oos" else 0)
        frames = {}
        for i, s in enumerate(cfg.symbols):
            job["message"] = f"Veri indiriliyor: {s}"
            frames[s] = market.history(s, cfg.timeframe, hist_days)
            job["progress"] = 0.25 * (i + 1) / len(cfg.symbols)
        context = frames.get(CONTEXT_SYMBOL)
        if context is None:
            context = market.history(CONTEXT_SYMBOL, cfg.timeframe, hist_days)
        end = max(int(f["time"].iloc[-1]) for f in frames.values() if len(f))
        start = end - body.days * 86400
        model = None
        warning = None
        if body.ai_mode == "oos":
            job["message"] = "Test dönemi öncesi verilerle yeni model eğitiliyor (örneklem dışı)"
            gap = cfg.horizon_bars * cfg.tf_seconds
            m = AIModel()
            job["_model"] = m
            m.train({s: f[f["time"] < start - gap] for s, f in frames.items()}, cfg,
                    context[context["time"] < start - gap] if context is not None else None, persist=False)
            model = m
            job["model"] = {k: m.meta.get(k) for k in ("quality", "has_edge", "threshold", "summary", "data_from", "data_to")}
        elif body.ai_mode == "current":
            model = engine.model_for_cfg()
            if model is None:
                raise ValueError("Bu zaman dilimi için eğitilmiş model yok")
            if model.meta.get("data_to", 0) > start:
                warning = ("Mevcut model test döneminin bir kısmını eğitimde gördü; sonuçlar iyimser olabilir. "
                           "Gerçekçi sonuç için 'Örneklem dışı' modu kullanın.")
        job["message"] = "Simülasyon çalışıyor"
        res = run_backtest(frames, cfg, model, start, body.initial_balance,
                           progress=lambda p: job.__setitem__("progress", 0.5 + 0.5 * p), context=context)
        res["warning"] = warning
        res["model"] = job.get("model")
        res["data_source"] = market.active
        params = {**body.model_dump(), "symbols": cfg.symbols, "timeframe": cfg.timeframe, "config": cfg.model_dump()}
        db.save_backtest(job_id, params, clean(res))
        job.update(state="done", progress=1.0, message="Tamamlandı")
    except Exception as exc:
        log.exception("backtest failed")
        job.update(state="error", message=str(exc))
    finally:
        job.pop("_model", None)


@app.post("/api/backtest", dependencies=[Depends(auth)])
def backtest(body: BacktestBody):
    running = [j for j in JOBS.values() if j["state"] == "running"]
    if running:
        raise HTTPException(409, "Başka bir backtest çalışıyor")
    overrides = {k: v for k, v in body.overrides.items() if k in BotConfig.model_fields and k != "mode"}
    cfg = BotConfig(**{**engine.cfg.model_dump(), **overrides,
                       **({"symbols": body.symbols} if body.symbols else {}),
                       **({"timeframe": body.timeframe} if body.timeframe else {}),
                       **({"strategy_mode": "rules"} if body.ai_mode == "rules" else {"strategy_mode": "ai"})})
    job_id = uuid.uuid4().hex[:10]
    JOBS[job_id] = {"id": job_id, "state": "running", "progress": 0.0, "message": "Başlatılıyor", "created": time.time()}
    threading.Thread(target=_backtest_job, args=(job_id, body, cfg), daemon=True).start()
    return {k: v for k, v in JOBS[job_id].items() if not k.startswith("_")}


@app.get("/api/backtest/{job_id}", dependencies=[Depends(auth)])
def backtest_status(job_id: str):
    job = JOBS.get(job_id)
    saved = db.get_backtest(job_id)
    if saved:
        return {"id": job_id, "state": "done", "progress": 1.0, "message": "Tamamlandı", **saved}
    if not job:
        raise HTTPException(404, "Bulunamadı")
    out = {k: v for k, v in job.items() if not k.startswith("_")}
    m = job.get("_model")
    if job["state"] == "running" and m is not None and m.status.state == "running":
        out["progress"] = 0.25 + 0.25 * m.status.progress
        out["message"] = f"Örneklem dışı model: {m.status.message}"
    return out


@app.get("/api/backtests", dependencies=[Depends(auth)])
def backtests():
    return {"backtests": db.list_backtests()}


# ------------------------------------------------------------------------------------------------
# websocket
# ------------------------------------------------------------------------------------------------
@app.websocket("/ws")
async def ws(websocket: WebSocket):
    if not _token_ok(websocket.query_params.get("token")):
        await websocket.close(code=4401)
        return
    await websocket.accept()
    q: asyncio.Queue = asyncio.Queue()
    engine.subscribers.add(q)
    try:
        await websocket.send_text(json.dumps(clean({"type": "state", "data": engine.snapshot()}), allow_nan=False))
        while True:
            msg = await q.get()
            await websocket.send_text(json.dumps(clean(msg), ensure_ascii=False, allow_nan=False))
    except (WebSocketDisconnect, RuntimeError, ConnectionError):
        pass
    except Exception as exc:  # connection closed mid-send etc.
        log.debug("websocket closed: %s", exc)
    finally:
        engine.subscribers.discard(q)


# ------------------------------------------------------------------------------------------------
# dashboard
# ------------------------------------------------------------------------------------------------
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="dashboard")
else:
    @app.get("/")
    def index_missing():
        return {"message": "Arayüz derlenmemiş. 'cd frontend && npm install && npm run build' çalıştırın "
                           "veya geliştirme için 'npm run dev' ile http://localhost:5173 adresini açın."}


def run() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    run()
