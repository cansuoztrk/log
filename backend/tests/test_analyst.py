import json
from types import SimpleNamespace

import anthropic
import pytest

from app import analyst

INFO = {
    "time": 123, "price": 100.0, "action": "WAIT", "prob": 0.55, "threshold": 0.64, "rule_score": 0.2,
    "confidence": 0.6, "regime_label": "Yatay Piyasa",
    "experts": [{"label": "Trend", "score": 0.4}],
    "indicators": {"rsi": 55.0}, "levels": {"entry": 100.0}, "reasons": [{"text": "x", "impact": "neutral"}],
}
ANALYSIS = {
    "ozet": "Ö", "gorunum": "notr", "teknik": "T", "firsatlar": ["F"], "riskler": ["R"],
    "yukselis_senaryosu": "Y", "dusus_senaryosu": "D", "bot_karari": "B",
    "izlenecek_seviyeler": [{"seviye": 99.0, "aciklama": "destek"}],
}


class FakeMessages:
    def __init__(self, calls, stop="end_turn"):
        self.calls, self.stop = calls, stop

    def create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(
            stop_reason=self.stop, model=kw["model"],
            content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=json.dumps(ANALYSIS))],
        )


def fake_client(calls, stop="end_turn"):
    msgs = FakeMessages(calls, stop)
    return lambda **_: SimpleNamespace(messages=msgs, beta=SimpleNamespace(messages=msgs))


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test")
    analyst._cache.clear()


def test_analyze_uses_structured_output_and_fallbacks(monkeypatch):
    calls = []
    monkeypatch.setattr(anthropic, "Anthropic", fake_client(calls))
    monkeypatch.setattr(analyst.settings, "anthropic_model", "claude-opus-5")
    res = analyst.analyze("BTC/USDT", "4h", INFO, [], None, {})
    assert res["analysis"] == ANALYSIS
    kw = calls[0]
    assert kw["fallbacks"] == "default" and kw["betas"] == ["server-side-fallback-2026-07-01"]
    assert kw["thinking"] == {"type": "adaptive"}
    assert kw["output_config"]["format"]["type"] == "json_schema"
    # cached for the same bar
    analyst.analyze("BTC/USDT", "4h", INFO, [], None, {})
    assert len(calls) == 1


def test_analyze_handles_refusal(monkeypatch):
    monkeypatch.setattr(anthropic, "Anthropic", fake_client([], stop="refusal"))
    with pytest.raises(RuntimeError, match="reddetti"):
        analyst.analyze("ETH/USDT", "4h", INFO, [], None, {})


def test_analyze_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)
    with pytest.raises(RuntimeError, match="ANTHROPIC_API_KEY"):
        analyst.analyze("SOL/USDT", "4h", INFO, [], None, {})
