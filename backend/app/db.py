"""SQLite persistence (standard library only). One connection per call keeps it thread-safe."""
from __future__ import annotations

import json
import sqlite3
import time
from contextlib import contextmanager

from .config import settings

DB_PATH = settings.data_dir / "bot.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY, mode TEXT NOT NULL, symbol TEXT NOT NULL,
    entry_time INTEGER NOT NULL, exit_time INTEGER NOT NULL, pnl REAL NOT NULL, data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS trades_exit ON trades(mode, exit_time);
CREATE TABLE IF NOT EXISTS equity (ts INTEGER NOT NULL, mode TEXT NOT NULL, equity REAL NOT NULL, cash REAL NOT NULL);
CREATE INDEX IF NOT EXISTS equity_ts ON equity(mode, ts);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL NOT NULL, level TEXT NOT NULL,
    kind TEXT NOT NULL, message TEXT NOT NULL, data TEXT
);
CREATE TABLE IF NOT EXISTS backtests (id TEXT PRIMARY KEY, created REAL NOT NULL, params TEXT NOT NULL, result TEXT NOT NULL);
"""


@contextmanager
def connect():
    con = sqlite3.connect(DB_PATH, timeout=30)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init() -> None:
    with connect() as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript(SCHEMA)


def kv_get(key: str, default=None):
    with connect() as con:
        row = con.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
    return json.loads(row["value"]) if row else default


def kv_set(key: str, value) -> None:
    with connect() as con:
        con.execute("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (key, json.dumps(value, ensure_ascii=False)))


def add_trade(mode: str, trade: dict) -> None:
    with connect() as con:
        con.execute(
            "INSERT OR REPLACE INTO trades(id, mode, symbol, entry_time, exit_time, pnl, data) VALUES(?,?,?,?,?,?,?)",
            (trade["id"], mode, trade["symbol"], trade["entry_time"], trade["exit_time"], trade["pnl"],
             json.dumps(trade, ensure_ascii=False)),
        )


def trades(mode: str, limit: int = 5000, symbol: str | None = None, since: int | None = None) -> list[dict]:
    q = "SELECT data FROM trades WHERE mode=?"
    args: list = [mode]
    if symbol:
        q += " AND symbol=?"
        args.append(symbol)
    if since:
        q += " AND exit_time>=?"
        args.append(since)
    q += " ORDER BY exit_time DESC LIMIT ?"
    args.append(limit)
    with connect() as con:
        rows = con.execute(q, args).fetchall()
    return [json.loads(r["data"]) for r in rows]


def clear_mode(mode: str) -> None:
    with connect() as con:
        con.execute("DELETE FROM trades WHERE mode=?", (mode,))
        con.execute("DELETE FROM equity WHERE mode=?", (mode,))


def add_equity(mode: str, equity: float, cash: float, ts: int | None = None) -> None:
    with connect() as con:
        con.execute("INSERT INTO equity(ts, mode, equity, cash) VALUES(?,?,?,?)", (ts or int(time.time()), mode, equity, cash))


def equity_curve(mode: str, since: int = 0, max_points: int = 1500) -> list[dict]:
    with connect() as con:
        rows = con.execute("SELECT ts, equity, cash FROM equity WHERE mode=? AND ts>=? ORDER BY ts", (mode, since)).fetchall()
    if len(rows) > max_points:
        step = len(rows) / max_points
        rows = [rows[int(i * step)] for i in range(max_points)] + [rows[-1]]
    return [{"time": r["ts"], "equity": r["equity"], "cash": r["cash"]} for r in rows]


def add_event(level: str, kind: str, message: str, data: dict | None = None) -> dict:
    ev = {"ts": time.time(), "level": level, "kind": kind, "message": message, "data": data}
    with connect() as con:
        cur = con.execute("INSERT INTO events(ts, level, kind, message, data) VALUES(?,?,?,?,?)",
                          (ev["ts"], level, kind, message, json.dumps(data, ensure_ascii=False) if data else None))
        ev["id"] = cur.lastrowid
        # Keep the table bounded.
        con.execute("DELETE FROM events WHERE id < ?", (ev["id"] - 5000,))
    return ev


def events(limit: int = 200) -> list[dict]:
    with connect() as con:
        rows = con.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [{"id": r["id"], "ts": r["ts"], "level": r["level"], "kind": r["kind"], "message": r["message"],
             "data": json.loads(r["data"]) if r["data"] else None} for r in rows]


def save_backtest(bt_id: str, params: dict, result: dict) -> None:
    with connect() as con:
        con.execute("INSERT OR REPLACE INTO backtests(id, created, params, result) VALUES(?,?,?,?)",
                    (bt_id, time.time(), json.dumps(params, ensure_ascii=False), json.dumps(result, ensure_ascii=False)))
        con.execute("DELETE FROM backtests WHERE id NOT IN (SELECT id FROM backtests ORDER BY created DESC LIMIT 20)")


def list_backtests() -> list[dict]:
    with connect() as con:
        rows = con.execute("SELECT id, created, params, result FROM backtests ORDER BY created DESC").fetchall()
    out = []
    for r in rows:
        res = json.loads(r["result"])
        out.append({"id": r["id"], "created": r["created"], "params": json.loads(r["params"]), "stats": res.get("stats", {})})
    return out


def get_backtest(bt_id: str) -> dict | None:
    with connect() as con:
        row = con.execute("SELECT created, params, result FROM backtests WHERE id=?", (bt_id,)).fetchone()
    if not row:
        return None
    return {"id": bt_id, "created": row["created"], "params": json.loads(row["params"]), "result": json.loads(row["result"])}
