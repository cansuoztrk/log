import numpy as np
import pandas as pd
import pytest

from app.ai_model import NO_TRADE_THRESHOLD, AIModel, _choose_threshold
from app.backtest import run_backtest
from app.config import BotConfig
from app.features import FEATURES, build_features, market_context, triple_barrier_labels
from app.indicators import add_indicators
from app.market import market
from app.strategy import signal_frame
from app.trading import apply_fill, check_exits, close_trade_record, new_position, on_bar_close, position_size

CFG = BotConfig()


@pytest.fixture(scope="module")
def frames():
    market.probe()
    return {s: market.history(s, "4h", 500) for s in ["BTC/USDT", "ETH/USDT", "SOL/USDT"]}


def test_simulated_history_is_clean(frames):
    df = frames["BTC/USDT"]
    assert len(df) > 2500
    assert df["time"].is_monotonic_increasing and df["time"].is_unique
    assert (df["high"] >= df[["open", "close"]].max(axis=1) - 1e-9).all()
    assert (df["low"] <= df[["open", "close"]].min(axis=1) + 1e-9).all()


def test_indicators_have_no_lookahead(frames):
    df = frames["ETH/USDT"]
    full = add_indicators(df)
    part = add_indicators(df.iloc[:1500])
    cols = ["ema200", "rsi", "macd_hist", "atr", "adx", "bb_pctb", "st_dir", "mfi", "vwap", "obv"]
    pd.testing.assert_frame_equal(full[cols].iloc[:1500].reset_index(drop=True), part[cols].reset_index(drop=True), check_exact=False, rtol=1e-9)
    assert full["rsi"].dropna().between(0, 100).all()
    assert (full["atr"].dropna() > 0).all()


def test_features_have_no_lookahead(frames):
    btc = add_indicators(frames["BTC/USDT"])
    ctx = market_context(btc)
    ind = add_indicators(frames["SOL/USDT"])
    full = build_features(ind, ctx)
    part = build_features(ind.iloc[:1800], ctx)
    assert list(full.columns) == FEATURES
    a = full.iloc[:1800].to_numpy()
    b = part.to_numpy()
    assert np.allclose(a, b, equal_nan=True)


def test_triple_barrier_labels():
    n = 60
    close = np.full(n, 100.0)
    close[12:] = 110.0  # jump up -> targets hit
    df = pd.DataFrame({"time": np.arange(n) * 3600, "open": close, "high": close + 0.5, "low": close - 0.5, "close": close, "volume": 1.0})
    df["atr"] = 1.0
    y, r = triple_barrier_labels(df, sl_atr_mult=2.0, tp_r=1.0, horizon=10)
    assert y.iloc[5] == 1 and r.iloc[5] == 1.0  # up-move within horizon
    assert y.iloc[20] == 0  # flat afterwards: timeout without profit
    assert y.iloc[-5:].isna().all()  # future not observed yet


def _pos(entry=100.0, atr=1.0, cfg=CFG):
    return new_position("X/USDT", 0, entry, 10.0, atr, cfg)


def test_stop_wins_when_bar_touches_both():
    p = _pos()
    acts = check_exits(p, CFG, high=p.tp2 + 1, low=p.stop - 1)
    assert acts == [("stop", p.stop, 10.0)]


def test_tp1_partial_then_breakeven_and_trailing():
    cfg = CFG
    p = _pos()
    acts = check_exits(p, cfg, high=p.tp1 + 0.01, low=p.entry_price)
    assert acts[0][0] == "tp1" and acts[0][2] == pytest.approx(5.0)
    assert p.tp1_hit and p.stop > p.entry_price  # breakeven incl. costs
    apply_fill(p, *acts[0][:3], fee=0.0, t=1)
    # trailing moves up with new highs
    on_bar_close(p, cfg, high=110.0, close=109.0, atr=1.0)
    assert p.stop == pytest.approx(110.0 - cfg.trailing_atr_mult * 1.0)
    acts = check_exits(p, cfg, high=109.0, low=p.stop - 0.1)
    assert acts[0][0] == "trailing"
    apply_fill(p, acts[0][0], acts[0][1], acts[0][2], fee=0.0, t=2)
    rec = close_trade_record(p, 2)
    assert rec["pnl"] > 0 and rec["exit_label"].startswith("TP1")


def test_pnl_accounting_matches_cash_flows():
    p = _pos()
    p.entry_fee = 1.0
    apply_fill(p, "tp1", 102.0, 5.0, fee=0.5, t=1)
    apply_fill(p, "stop", 99.0, 5.0, fee=0.5, t=2)
    rec = close_trade_record(p, 2)
    cash_flow = -100 * 10 - 1.0 + (102 * 5 - 0.5) + (99 * 5 - 0.5)
    assert rec["pnl"] == pytest.approx(cash_flow)


def test_time_stop():
    cfg = CFG.model_copy(update={"time_stop_bars": 3})
    p = _pos(cfg=cfg)
    assert on_bar_close(p, cfg, 100.5, 100.2, 1.0) == []
    assert on_bar_close(p, cfg, 100.5, 100.2, 1.0) == []
    assert on_bar_close(p, cfg, 100.5, 100.2, 1.0)[0][0] == "time"


def test_position_size_respects_risk_budget():
    cfg = CFG.model_copy(update={"risk_per_trade_pct": 1.0, "max_position_pct": 100.0, "confidence_sizing": False})
    qty = position_size(10_000, 10_000, entry=100.0, stop=95.0, cfg=cfg)
    loss_at_stop = qty * 5.0 + qty * 100.0 * 2 * (cfg.fee_pct + cfg.slippage_pct) / 100
    assert loss_at_stop == pytest.approx(100.0, rel=1e-6)
    capped = position_size(10_000, 10_000, entry=100.0, stop=99.9, cfg=cfg.model_copy(update={"max_position_pct": 20.0}))
    assert capped * 100.0 <= 2_000 + 1e-6
    assert position_size(10_000, 5.0, entry=100.0, stop=95.0, cfg=cfg) == 0.0  # below min notional


def test_threshold_selection_refuses_to_trade_without_edge():
    rng = np.random.default_rng(0)
    p = rng.random(3000)
    y = (rng.random(3000) < 0.45).astype(float)  # losing coin flip, independent of p
    r = np.where(y == 1, 1.0, -1.0)
    thr, curve, edge = _choose_threshold(p, y, r, np.full(3000, 0.1), min_trades=30)
    assert not edge and thr == NO_TRADE_THRESHOLD
    # with a real relationship the edge is found
    y2 = (rng.random(3000) < 0.2 + 0.6 * p).astype(float)
    thr2, _, edge2 = _choose_threshold(p, y2, np.where(y2 == 1, 1.0, -1.0), np.full(3000, 0.1), min_trades=30)
    assert edge2 and 0.5 <= thr2 < 1


def test_signal_frame_rules_mode(frames):
    ind = add_indicators(frames["BTC/USDT"])
    sig = signal_frame(ind, CFG.model_copy(update={"strategy_mode": "rules"}), None)
    assert {"buy", "exit", "rule_score", "regime", "candidate"} <= set(sig.columns)
    assert sig["rule_score"].between(-1, 1).all()
    assert not sig["buy"].iloc[:199].any()  # EMA200 warm-up
    assert (sig.loc[sig["buy"], "candidate"]).all()


def test_train_and_backtest_consistency(frames):
    cfg = CFG.model_copy(update={"symbols": list(frames)})
    end = int(frames["BTC/USDT"]["time"].iloc[-1])
    start = end - 90 * 86400
    gap = cfg.horizon_bars * cfg.tf_seconds
    m = AIModel()
    meta = m.train({s: f[f["time"] < start - gap] for s, f in frames.items()}, cfg, persist=False)
    assert m.ready and len(meta["folds"]) >= 3 and meta["quality"] in {"strong", "weak", "none"}
    assert meta["data_to"] < start  # trained strictly before the test window

    res = run_backtest(frames, cfg, m, start, 10_000)
    st = res["stats"]
    assert all(t["entry_time"] >= start for t in res["trades"])
    if st["trades"]:
        assert st["end_equity"] == pytest.approx(10_000 + st["net_pnl"], rel=1e-9)
        # risk per trade is bounded: no single loss much bigger than 1R
        assert min(t["r_multiple"] for t in res["trades"]) > -1.6
    assert res["equity"][0]["equity"] == pytest.approx(10_000, rel=0.02)
