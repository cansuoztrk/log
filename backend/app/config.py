"""Environment settings (process-level) and the runtime bot configuration (editable from the UI)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    """Minimal .env loader so the app works without python-dotenv."""
    for candidate in (BASE_DIR / ".env", BASE_DIR.parent / ".env"):
        if not candidate.exists():
            continue
        for raw in candidate.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on", "evet"}


class Settings:
    exchange: str = os.getenv("EXCHANGE", "binance").lower()
    api_key: str = os.getenv("EXCHANGE_API_KEY", "")
    api_secret: str = os.getenv("EXCHANGE_API_SECRET", "")
    api_password: str = os.getenv("EXCHANGE_API_PASSWORD", "")
    enable_live_trading: bool = _bool("ENABLE_LIVE_TRADING")
    # auto: use the exchange, fall back to simulated data when it is unreachable.
    data_source: str = os.getenv("DATA_SOURCE", "auto").lower()
    anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-opus-5")
    dashboard_token: str = os.getenv("DASHBOARD_TOKEN", "")
    data_dir: Path = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))

    @property
    def has_anthropic(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))

    @property
    def has_exchange_keys(self) -> bool:
        return bool(self.api_key and self.api_secret)


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)

TIMEFRAMES = ["15m", "30m", "1h", "4h", "1d"]
TIMEFRAME_SECONDS = {"1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400}


class BotConfig(BaseModel):
    """Everything the user can tune from the Settings page. Persisted in SQLite."""

    mode: Literal["paper", "live"] = "paper"
    symbols: list[str] = Field(default_factory=lambda: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"])
    timeframe: str = "4h"
    paper_starting_balance: float = Field(10_000.0, gt=0)

    # Risk
    risk_per_trade_pct: float = Field(1.0, gt=0, le=5)
    max_open_positions: int = Field(3, ge=1, le=20)
    max_position_pct: float = Field(30.0, gt=0, le=100)
    daily_loss_limit_pct: float = Field(3.0, gt=0, le=50)
    max_drawdown_pct: float = Field(15.0, gt=0, le=90)
    cooldown_bars: int = Field(3, ge=0, le=100)
    confidence_sizing: bool = True

    # Exits (ATR based)
    sl_atr_mult: float = Field(2.0, gt=0.2, le=10)
    tp1_r: float = Field(1.0, gt=0.1, le=10)
    tp1_close_pct: float = Field(50.0, ge=0, le=100)
    tp2_r: float = Field(3.0, gt=0.2, le=20)
    trailing_atr_mult: float = Field(2.0, gt=0.2, le=10)
    breakeven_after_tp1: bool = True
    time_stop_bars: int = Field(48, ge=0, le=1000)

    # Signal
    strategy_mode: Literal["ai", "rules"] = "ai"
    ai_threshold: float = Field(0.0, ge=0.0, le=0.95)  # 0 = use the threshold the model calibrated itself
    min_rule_score: float = Field(0.15, ge=-1.0, le=1.0)
    trend_filter: bool = True
    btc_filter: bool = True
    exit_on_signal_reversal: bool = True

    # Costs
    fee_pct: float = Field(0.1, ge=0, le=2)
    slippage_pct: float = Field(0.03, ge=0, le=2)

    # Engine
    poll_interval_sec: int = Field(15, ge=5, le=600)
    train_days: int = Field(730, ge=60, le=2000)
    auto_retrain_hours: int = Field(24, ge=0, le=720)

    @field_validator("symbols")
    @classmethod
    def _symbols(cls, v: list[str]) -> list[str]:
        cleaned = []
        for s in v:
            s = s.strip().upper().replace("-", "/")
            if s and "/" not in s and s.endswith("USDT"):
                s = f"{s[:-4]}/USDT"
            if s and s not in cleaned:
                cleaned.append(s)
        if not cleaned:
            raise ValueError("En az bir sembol gerekli")
        if len(cleaned) > 20:
            raise ValueError("En fazla 20 sembol")
        return cleaned

    @field_validator("timeframe")
    @classmethod
    def _timeframe(cls, v: str) -> str:
        if v not in TIMEFRAMES:
            raise ValueError(f"Zaman dilimi şunlardan biri olmalı: {', '.join(TIMEFRAMES)}")
        return v

    @property
    def tf_seconds(self) -> int:
        return TIMEFRAME_SECONDS[self.timeframe]

    @property
    def horizon_bars(self) -> int:
        """How many bars the AI label looks ahead (also used as the purge gap)."""
        return max(12, min(self.time_stop_bars or 48, 96))
