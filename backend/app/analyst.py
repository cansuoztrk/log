"""Optional AI market analyst powered by Claude (needs ANTHROPIC_API_KEY).

It explains the bot's numbers in plain Turkish. It never places or blocks trades: every trading
decision stays with the backtestable model and rules.
"""
from __future__ import annotations

import json
import logging
import time

from .config import settings

log = logging.getLogger(__name__)
CACHE_SECONDS = 900
_cache: dict[tuple[str, int], dict] = {}

# Models that accept the server-side refusal fallback ("fallbacks": "default").
FALLBACK_MODELS = {"claude-opus-5", "claude-fable-5-1"}

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["ozet", "gorunum", "teknik", "firsatlar", "riskler", "yukselis_senaryosu", "dusus_senaryosu",
                 "bot_karari", "izlenecek_seviyeler"],
    "properties": {
        "ozet": {"type": "string", "description": "2-3 cümlelik genel değerlendirme"},
        "gorunum": {"type": "string", "enum": ["olumlu", "notr", "olumsuz"]},
        "teknik": {"type": "string", "description": "Trend, momentum, hacim ve volatilite yorumu (1 paragraf)"},
        "firsatlar": {"type": "array", "items": {"type": "string"}},
        "riskler": {"type": "array", "items": {"type": "string"}},
        "yukselis_senaryosu": {"type": "string"},
        "dusus_senaryosu": {"type": "string"},
        "bot_karari": {"type": "string", "description": "Botun AL/BEKLE/ÇIK kararının değerlendirmesi"},
        "izlenecek_seviyeler": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["seviye", "aciklama"],
                "properties": {"seviye": {"type": "number"}, "aciklama": {"type": "string"}},
            },
        },
    },
}

SYSTEM = (
    "Sen deneyimli, temkinli bir kripto para piyasa analistisin. Sana otomatik bir al-sat botunun "
    "hesapladığı teknik göstergeler, AI modeli olasılıkları ve risk seviyeleri veriliyor. Görevin bu "
    "verileri Türkçe, açık ve dengeli şekilde yorumlamak. Sadece verilen verilere dayan; haber, fiyat "
    "tahmini veya garanti uydurma. Belirsizliği açıkça belirt. Bu bir yatırım tavsiyesi değildir; "
    "kullanıcıya risk yönetimini hatırlat."
)


def available() -> bool:
    return settings.has_anthropic


def analyze(symbol: str, timeframe: str, info: dict, candles: list[dict], position: dict | None, model_meta: dict) -> dict:
    key = (symbol, int(info.get("time", 0)))
    hit = _cache.get(key)
    if hit and time.time() - hit["created"] < CACHE_SECONDS:
        return hit
    if not available():
        raise RuntimeError("AI Analist için .env dosyasına ANTHROPIC_API_KEY ekleyin")

    import anthropic  # optional dependency path

    payload = {
        "sembol": symbol,
        "zaman_dilimi": timeframe,
        "fiyat": info["price"],
        "bot_karari": info["action"],
        "ai_kazanma_olasiligi": info["prob"],
        "ai_esik": info["threshold"],
        "kural_skoru": info["rule_score"],
        "guven": info["confidence"],
        "piyasa_rejimi": info["regime_label"],
        "uzman_oylari": {e["label"]: round(e["score"], 2) for e in info["experts"]},
        "gostergeler": {k: round(v, 6) if isinstance(v, float) else v for k, v in info["indicators"].items()},
        "onerilen_seviyeler": info["levels"],
        "gerekceler": [r["text"] for r in info["reasons"]],
        "son_mumlar": candles[-40:],
        "acik_pozisyon": position,
        "model_kalitesi": {
            "avantaj": model_meta.get("quality"),
            "oos_kazanma_orani": (model_meta.get("summary") or {}).get("pooled_win_rate"),
            "oos_beklenti_R": (model_meta.get("summary") or {}).get("pooled_expectancy_r"),
        },
    }
    prompt = (
        "Aşağıdaki JSON, botun bu sembol için son kapanan mumdaki analizidir. Bunu yorumla ve istenen "
        "şemada yanıt ver. 'izlenecek_seviyeler' için yalnızca verideki fiyatlardan (EMA'lar, stop, "
        "hedefler, son zirve/dipler) türetilmiş 2-5 seviye ver.\n\n" + json.dumps(payload, ensure_ascii=False)
    )

    client = anthropic.Anthropic(max_retries=2, timeout=120.0)
    model = settings.anthropic_model
    kwargs: dict = {
        "model": model,
        "max_tokens": 16000,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": prompt}],
    }
    if "haiku" in model:
        kwargs["output_config"] = {"format": {"type": "json_schema", "schema": SCHEMA}}
    else:
        kwargs["thinking"] = {"type": "adaptive"}
        kwargs["output_config"] = {"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}}
    try:
        if model in FALLBACK_MODELS:
            resp = client.beta.messages.create(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs)
        else:
            resp = client.messages.create(**kwargs)
    except anthropic.AuthenticationError as exc:
        raise RuntimeError("Anthropic API anahtarı geçersiz") from exc
    except anthropic.RateLimitError as exc:
        raise RuntimeError("Anthropic hız limiti aşıldı, biraz sonra tekrar deneyin") from exc
    except anthropic.APIStatusError as exc:
        raise RuntimeError(f"Anthropic API hatası ({exc.status_code}): {exc.message}") from exc
    except anthropic.APIConnectionError as exc:
        raise RuntimeError("Anthropic API'ye bağlanılamadı") from exc

    if resp.stop_reason == "refusal":
        raise RuntimeError("Model bu isteği yanıtlamayı reddetti")
    if resp.stop_reason == "max_tokens":
        raise RuntimeError("Yanıt yarıda kesildi, tekrar deneyin")
    text = "".join(b.text for b in resp.content if b.type == "text")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Analiz yanıtı çözümlenemedi") from exc
    result = {"symbol": symbol, "bar_time": key[1], "created": time.time(), "model": resp.model, "analysis": data}
    _cache[key] = result
    return result
