"""Tests for the indicator math and the FastAPI endpoints.

Run with:  python -m pytest tests -q
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import indicators as ind
from app.main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def make_candles(n: int = 300, seed: int = 42) -> list[dict]:
    rng = np.random.default_rng(seed)
    close = 100.0 + np.cumsum(rng.normal(0, 1.0, n))
    open_ = close + rng.normal(0, 0.2, n)
    high = np.maximum(open_, close) + np.abs(rng.normal(0, 0.4, n))
    low = np.minimum(open_, close) - np.abs(rng.normal(0, 0.4, n))
    volume = np.abs(rng.normal(1e6, 2e5, n))
    base = 1_700_000_000  # fixed epoch
    return [
        {
            "time": base + i * 3600,
            "open": round(float(open_[i]), 4),
            "high": round(float(high[i]), 4),
            "low": round(float(low[i]), 4),
            "close": round(float(close[i]), 4),
            "volume": round(float(volume[i]), 2),
        }
        for i in range(n)
    ]


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# Pure math — known values
# ---------------------------------------------------------------------------


def test_sma_known_values():
    s = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    out = ind.sma(s, 3)
    assert np.isnan(out.iloc[0]) and np.isnan(out.iloc[1])
    assert out.iloc[2:].tolist() == pytest.approx([2.0, 3.0, 4.0])


def test_ema_seeds_with_first_value():
    s = pd.Series([1.0, 2.0, 3.0])
    out = ind.ema(s, 2)
    assert out.iloc[0] == pytest.approx(1.0)
    assert out.iloc[1] == pytest.approx(1.0 + (2 / 3) * 1.0)
    assert out.iloc[2] == pytest.approx(out.iloc[1] + (2 / 3) * (3.0 - out.iloc[1]))


def test_rsi_extremes():
    rising = pd.Series(np.arange(1.0, 40.0))  # strictly up
    out = ind.rsi(rising, 14)
    assert out.iloc[14:].round(2).eq(100.0).all()

    falling = pd.Series(np.arange(40.0, 1.0, -1.0))  # strictly down
    out = ind.rsi(falling, 14)
    assert out.iloc[14:].round(2).eq(0.0).all()

    flat = pd.Series(np.full(40, 50.0))  # no movement
    out = ind.rsi(flat, 14)
    assert out.iloc[14:].round(2).eq(50.0).all()


def test_rsi_bounded_and_warmup_dropped():
    s = pd.Series(100.0 + np.cumsum(np.random.default_rng(7).normal(0, 1, 200)))
    out = ind.rsi(s, 14)
    assert np.isnan(out.iloc[:14]).all()
    valid = out.dropna()
    assert ((valid >= 0) & (valid <= 100)).all()


def test_macd_components():
    s = pd.Series(np.linspace(1.0, 200.0, 300))  # monotonic uptrend
    line, sig, hist = ind.macd(s, 12, 26, 9)
    # Once the slow EMA is established, fast > slow in an uptrend. The first
    # values are the EWM seed (macd[0] == 0 exactly), so skip the warm-up.
    assert line.dropna().iloc[30:].gt(0).all()
    assert (hist.dropna() == (line - sig).dropna()).all()


def test_bollinger_ordering():
    s = pd.Series(100.0 + np.cumsum(np.random.default_rng(3).normal(0, 1, 200)))
    upper, mid, lower = ind.bollinger(s, 20, 2.0)
    mask = mid.notna()
    assert (upper[mask] >= mid[mask]).all()
    assert (mid[mask] >= lower[mask]).all()
    assert mid[mask].round(6).equals(ind.sma(s, 20)[mask].round(6))  # middle = SMA


def test_atr_positive():
    df = pd.DataFrame(make_candles(120))
    out = ind.atr(df["high"], df["low"], df["close"], 14)
    assert out.dropna().gt(0).all()


def test_stochastic_bounded():
    df = pd.DataFrame(make_candles(200))
    k, d = ind.stochastic(df["high"], df["low"], df["close"], 14, 3, 3)
    valid = k.dropna()
    assert ((valid >= 0) & (valid <= 100)).all()
    assert d.dropna().between(0, 100).all()


def test_obv_tracks_uptrend():
    close = pd.Series(np.linspace(1.0, 100.0, 100))
    volume = pd.Series(np.ones(100))
    out = ind.obv(close, volume)
    assert out.iloc[-1] == pytest.approx(99.0)  # every step up -> +1


# ---------------------------------------------------------------------------
# API level
# ---------------------------------------------------------------------------


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}


def test_calculate_returns_all_requested_indicators(client):
    payload = {
        "symbol": "BTC",
        "timeframe": "4h",
        "candles": make_candles(300),
        "indicators": [
            {"type": "sma", "params": {"period": 20}},
            {"type": "ema", "params": {"period": 50}},
            {"type": "rsi", "params": {"period": 14}},
            {"type": "macd", "params": {"fast": 12, "slow": 26, "signal": 9}},
            {"type": "bollinger", "params": {"period": 20, "stdDev": 2}},
        ],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["symbol"] == "BTC" and body["timeframe"] == "4h"
    assert len(body["results"]) == 5

    by_type = {r["type"]: r for r in body["results"]}
    assert set(by_type) == {"sma", "ema", "rsi", "macd", "bollinger"}
    assert by_type["sma"]["lines"]["sma"][0]["time"] == payload["candles"][19]["time"]
    # warm-up dropped: sma(20) starts at index 19, rsi(14) at 14, macd(slow 26) at 26
    assert len(by_type["sma"]["lines"]["sma"]) == 300 - 19
    assert len(by_type["rsi"]["lines"]["rsi"]) == 300 - 14
    assert len(by_type["macd"]["lines"]["macd"]) == 300 - 26
    assert by_type["macd"]["lines"]["macd"][0]["time"] == payload["candles"][26]["time"]
    # rsi values stay in [0, 100]
    assert all(0 <= p["value"] <= 100 for p in by_type["rsi"]["lines"]["rsi"])
    # bollinger has three lines
    assert set(by_type["bollinger"]["lines"]) == {"upper", "middle", "lower"}
    # macd histogram == macd - signal on every point
    macd = by_type["macd"]["lines"]
    for m, s, h in zip(macd["macd"], macd["signal"], macd["histogram"]):
        assert h["value"] == pytest.approx(m["value"] - s["value"])


def test_calculate_preserves_request_order_and_duplicates(client):
    payload = {
        "symbol": "ETH",
        "timeframe": "1d",
        "candles": make_candles(200, seed=1),
        "indicators": [
            {"type": "sma", "params": {"period": 10}},
            {"type": "sma", "params": {"period": 50}},
        ],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 200, res.text
    results = res.json()["results"]
    assert [r["params"]["period"] for r in results] == [10, 50]


def test_calculate_rejects_unsorted_candles(client):
    candles = make_candles(20)
    candles[5]["time"] = candles[4]["time"] - 1000  # break the sort
    payload = {
        "symbol": "BTC",
        "timeframe": "4h",
        "candles": candles,
        "indicators": [{"type": "sma", "params": {"period": 20}}],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 422


def test_calculate_rejects_unknown_indicator_type(client):
    payload = {
        "symbol": "BTC",
        "timeframe": "4h",
        "candles": make_candles(20),
        "indicators": [{"type": "vwap", "params": {}}],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 422


def test_calculate_rejects_fractional_integer_param(client):
    payload = {
        "symbol": "BTC",
        "timeframe": "4h",
        "candles": make_candles(200),
        "indicators": [{"type": "sma", "params": {"period": 20.7}}],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 400
    assert "whole number" in res.json()["detail"]


def test_calculate_rejects_out_of_range_param(client):
    payload = {
        "symbol": "BTC",
        "timeframe": "4h",
        "candles": make_candles(200),
        "indicators": [{"type": "rsi", "params": {"period": 9999}}],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 400
    assert "period" in res.json()["detail"]


def test_calculate_rejects_empty_indicator_list(client):
    payload = {
        "symbol": "BTC",
        "timeframe": "4h",
        "candles": make_candles(20),
        "indicators": [],
    }
    res = client.post("/api/v1/indicators/calculate", json=payload)
    assert res.status_code == 422
