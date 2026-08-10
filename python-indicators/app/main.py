"""Cryptolytic Technical Indicator Microservice.

Pure-Python/pandas implementations of common technical indicators, exposed
over HTTP. This service is called **exclusively by the Go API gateway** —
browsers never talk to it directly (User -> Frontend -> Go Backend -> Python).

    POST /api/v1/indicators/calculate   compute indicators over OHLCV data
    GET  /health                        liveness probe (kept warm by the gateway)
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from . import indicators as ind
from .schemas import (
    CalculateRequest,
    CalculateResponse,
    IndicatorResult,
    Point,
)

logger = logging.getLogger("indicators")

app = FastAPI(
    title="Cryptolytic Indicator Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
    description="Pure pandas/numpy technical indicators for the Cryptolytic Go gateway.",
)

# Candle payloads are capped at 5k * ~150 bytes (~750 KB); reject anything
# larger up-front so a misbehaving caller can't buffer unbounded bodies.
MAX_BODY_BYTES = 2 * 1024 * 1024


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    if request.method == "POST":
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
            return JSONResponse(status_code=413, content={"detail": "request body too large"})
    return await call_next(request)


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@app.get("/")
def root() -> dict:
    return {
        "service": "cryptolytic-indicator-service",
        "version": "1.0.0",
        "endpoints": ["POST /api/v1/indicators/calculate", "GET /health"],
    }


# ---------------------------------------------------------------------------
# Param helpers — every param is validated against sane bounds, defaults are
# applied when omitted (mirrors the Go gateway's validation).
# ---------------------------------------------------------------------------


def _param(p: dict, key: str, default: float, lo: float, hi: float, integer: bool) -> float:
    raw = p.get(key, default)
    v = float(raw)
    if integer:
        if v != round(v):
            raise HTTPException(status_code=400, detail=f"indicator param '{key}' must be a whole number")
        v = round(v)
    if not (lo <= v <= hi):
        raise HTTPException(
            status_code=400,
            detail=f"indicator param '{key}' must be between {lo:g} and {hi:g}, got {raw:g}",
        )
    return v


def _series_points(series: pd.Series, times: pd.Series) -> list[Point]:
    mask = series.notna()
    return [Point(time=int(t), value=float(v)) for t, v in zip(times[mask], series[mask])]


def _compute(df: pd.DataFrame, spec) -> IndicatorResult:
    """Compute one indicator spec over the OHLCV frame and strip NaN warm-up."""
    t, p = spec.type, spec.params
    times = df["time"]
    close, high, low, volume = df["close"], df["high"], df["low"], df["volume"]

    if t == "sma":
        period = int(_param(p, "period", 20, 2, 500, integer=True))
        out, params = {"sma": ind.sma(close, period)}, {"period": period}
    elif t == "ema":
        period = int(_param(p, "period", 20, 2, 500, integer=True))
        out, params = {"ema": ind.ema(close, period)}, {"period": period}
    elif t == "rsi":
        period = int(_param(p, "period", 14, 2, 250, integer=True))
        out, params = {"rsi": ind.rsi(close, period)}, {"period": period}
    elif t == "macd":
        fast = int(_param(p, "fast", 12, 2, 200, integer=True))
        slow = int(_param(p, "slow", 26, 3, 300, integer=True))
        signal = int(_param(p, "signal", 9, 2, 100, integer=True))
        if fast >= slow:
            raise HTTPException(status_code=400, detail="indicator 'macd' requires fast < slow")
        line, sig, hist = ind.macd(close, fast, slow, signal)
        out = {"macd": line, "signal": sig, "histogram": hist}
        params = {"fast": fast, "slow": slow, "signal": signal}
    elif t == "bollinger":
        period = int(_param(p, "period", 20, 2, 500, integer=True))
        std_dev = _param(p, "stdDev", 2.0, 0.1, 10.0, integer=False)
        upper, mid, lower = ind.bollinger(close, period, std_dev)
        out = {"upper": upper, "middle": mid, "lower": lower}
        params = {"period": period, "stdDev": std_dev}
    elif t == "atr":
        period = int(_param(p, "period", 14, 2, 250, integer=True))
        out, params = {"atr": ind.atr(high, low, close, period)}, {"period": period}
    elif t == "stochastic":
        period = int(_param(p, "period", 14, 2, 250, integer=True))
        smooth_k = int(_param(p, "smoothK", 3, 1, 50, integer=True))
        smooth_d = int(_param(p, "smoothD", 3, 1, 50, integer=True))
        k, d = ind.stochastic(high, low, close, period, smooth_k, smooth_d)
        out, params = {"k": k, "d": d}, {"period": period, "smoothK": smooth_k, "smoothD": smooth_d}
    elif t == "obv":
        out, params = {"obv": ind.obv(close, volume)}, {}
    else:  # pragma: no cover — guarded by the Literal type
        raise HTTPException(status_code=400, detail=f"unsupported indicator type: {t}")

    lines = {name: _series_points(series, times) for name, series in out.items()}
    return IndicatorResult(type=t, params=params, lines=lines)


@app.post("/api/v1/indicators/calculate", response_model=CalculateResponse)
def calculate(req: CalculateRequest) -> CalculateResponse:
    started = time.perf_counter()
    df = pd.DataFrame([c.model_dump() for c in req.candles])
    df["time"] = df["time"].astype("int64")

    results = [_compute(df, spec) for spec in req.indicators]

    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "computed %d indicators over %d candles in %.1f ms (%s %s)",
        len(results),
        len(df),
        elapsed_ms,
        req.symbol,
        req.timeframe,
    )
    return CalculateResponse(
        symbol=req.symbol,
        timeframe=req.timeframe,
        computedAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        results=results,
    )
