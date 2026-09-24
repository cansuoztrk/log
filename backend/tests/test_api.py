import time

from fastapi.testclient import TestClient

from app.main import app


def wait_signals(client, n=1, timeout=30):
    end = time.time() + timeout
    while time.time() < end:
        st = client.get("/api/state").json()
        if len(st["signals"]) >= n:
            return st
        time.sleep(0.5)
    raise AssertionError("signals never appeared")


def test_state_config_and_trading_flow():
    with TestClient(app) as client:
        assert client.get("/api/health").json()["ok"]
        st = wait_signals(client)
        assert st["status"]["data_source"] == "demo"
        assert st["status"]["mode"] == "paper"

        # invalid config is rejected with a readable message
        r = client.put("/api/config", json={"risk_per_trade_pct": 50})
        assert r.status_code == 422
        r = client.put("/api/config", json={"timeframe": "7m"})
        assert r.status_code == 422
        # live mode refused without ENABLE_LIVE_TRADING
        r = client.put("/api/config", json={"mode": "live"})
        assert r.status_code == 400 and "ENABLE_LIVE_TRADING" in r.json()["detail"]

        sym = st["signals"][0]["symbol"]
        sig = client.get("/api/signal", params={"symbol": sym}).json()
        assert sig["levels"]["stop_loss"] < sig["price"] < sig["levels"]["tp1"] < sig["levels"]["tp2"]
        candles = client.get("/api/candles", params={"symbol": sym, "limit": 200}).json()
        assert len(candles["candles"]) == 200 and len(candles["overlays"]["ema50"]) > 0

        r = client.post("/api/positions/open", json={"symbol": sym})
        assert r.status_code == 200, r.text
        assert any(p["symbol"] == sym for p in r.json()["positions"])
        r = client.post("/api/positions/open", json={"symbol": sym})
        assert r.status_code == 400  # one position per symbol
        r = client.post("/api/positions/close", json={"symbol": sym})
        assert r.status_code == 200 and not r.json()["positions"]
        trades = client.get("/api/trades").json()["trades"]
        assert trades and trades[0]["exit_reason"] == "manual"
        perf = client.get("/api/performance").json()
        assert perf["stats"]["trades"] >= 1

        r = client.post("/api/paper/reset", json={"balance": 5000})
        assert r.json()["account"]["equity"] == 5000
        assert client.get("/api/trades").json()["trades"] == []


def test_dashboard_token(monkeypatch):
    from app import main

    monkeypatch.setattr(main.settings, "dashboard_token", "s3cret")
    with TestClient(app) as client:
        assert client.get("/api/state").status_code == 401
        assert client.get("/api/state", headers={"Authorization": "Bearer nope"}).status_code == 401
        assert client.get("/api/state", headers={"Authorization": "Bearer s3cret"}).status_code == 200
        assert client.get("/api/auth").json() == {"required": True, "ok": False}
