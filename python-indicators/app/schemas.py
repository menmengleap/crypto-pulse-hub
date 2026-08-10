"""Pydantic request/response models for the indicator API.

The Go API gateway forwards the *exact* same payload shape, so these models
are the contract between the gateway and this microservice.
"""

from __future__ import annotations

import math
from typing import Dict, List, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

IndicatorType = Literal[
    "sma", "ema", "rsi", "macd", "bollinger", "atr", "stochastic", "obv"
]

TIMEFRAMES = {"1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"}


class Candle(BaseModel):
    """One OHLCV bar. ``time`` is a Unix epoch timestamp in seconds (UTC)."""

    time: int = Field(..., gt=0, description="Unix epoch seconds (UTC)")
    open: float = Field(..., gt=0)
    high: float = Field(..., gt=0)
    low: float = Field(..., gt=0)
    close: float = Field(..., gt=0)
    volume: float = Field(..., ge=0)


class IndicatorSpec(BaseModel):
    """One requested indicator, e.g. {"type": "sma", "params": {"period": 20}}."""

    type: IndicatorType
    params: Dict[str, float] = Field(default_factory=dict)


class CalculateRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    timeframe: str
    candles: List[Candle] = Field(..., min_length=5, max_length=5000)
    indicators: List[IndicatorSpec] = Field(..., min_length=1, max_length=12)

    @field_validator("timeframe")
    @classmethod
    def _valid_timeframe(cls, v: str) -> str:
        if v not in TIMEFRAMES:
            raise ValueError("timeframe must be one of 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w")
        return v

    @model_validator(mode="after")
    def _sane_market_data(self) -> "CalculateRequest":
        prev: int | None = None
        for c in self.candles:
            if not all(math.isfinite(x) for x in (c.open, c.high, c.low, c.close, c.volume)):
                raise ValueError("all candle values must be finite numbers")
            if prev is not None and c.time <= prev:
                raise ValueError("candles must be sorted ascending by time with no duplicates")
            prev = c.time
        return self


class Point(BaseModel):
    """One value of an indicator series (warm-up NaNs already dropped)."""

    time: int
    value: float


class IndicatorResult(BaseModel):
    """One computed indicator; ``lines`` maps a label to its series points.

    Examples:  sma -> {"sma": [...]}; bollinger -> {"upper"/"middle"/"lower"};  macd -> {"macd"/"signal"/"histogram"}.
    """

    type: str
    params: Dict[str, float]
    lines: Dict[str, List[Point]]


class CalculateResponse(BaseModel):
    symbol: str
    timeframe: str
    computedAt: str
    results: List[IndicatorResult] = Field(..., description="One entry per requested indicator, in request order")


# Re-exported for the router module.
__all__: List[str] = [
    "Candle",
    "IndicatorSpec",
    "CalculateRequest",
    "CalculateResponse",
    "IndicatorResult",
    "Point",
]
