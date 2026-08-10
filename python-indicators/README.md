# Cryptolytic Indicator Service

Pure **Python (pandas/numpy)** technical-indicator microservice. Every
indicator is implemented from scratch — no `ta-lib`, no `tti`, no indicator
libraries — and exposed over FastAPI.

```
React Frontend ── OHLCV + indicator specs ──> Go API Gateway ──> this service
        ^                                          |                  |
        └────────── computed series (JSON) <────────┴──────────────────┘
```

Browsers **never** talk to this service directly. The Go backend
(`backend/internal/indicators`) forwards the same payload you POST to it.

## Supported indicators

| Type         | Params                     | Returns (`lines`)                    |
| ------------ | -------------------------- | ------------------------------------ |
| `sma`        | `period` (2–500)           | `sma`                                |
| `ema`        | `period` (2–500)           | `ema`                                |
| `rsi`        | `period` (2–250)           | `rsi`                                |
| `macd`       | `fast` `slow` `signal`     | `macd`, `signal`, `histogram`        |
| `bollinger`  | `period`, `stdDev`         | `upper`, `middle`, `lower`           |
| `atr`        | `period` (2–250)           | `atr`                                |
| `stochastic` | `period`, `smoothK`, `smoothD` | `k`, `d`                         |
| `obv`        | —                          | `obv`                                |

Warm-up values (where the math is not yet defined) are dropped, so returned
series only contain meaningful points aligned to the candle timestamps.

## API

### `POST /api/v1/indicators/calculate`

```bash
curl -s http://localhost:8000/api/v1/indicators/calculate \
  -H 'content-type: application/json' \
  -d '{
    "symbol": "BTC",
    "timeframe": "4h",
    "candles": [
      {"time": 1700000000, "open": 42000.0, "high": 42500.0, "low": 41800.0, "close": 42300.0, "volume": 1200.5}
    ],
    "indicators": [
      {"type": "sma", "params": {"period": 20}},
      {"type": "macd", "params": {"fast": 12, "slow": 26, "signal": 9}}
    ]
  }'
```

Response (indicators echo request order):

```json
{
  "symbol": "BTC",
  "timeframe": "4h",
  "computedAt": "2026-08-10T12:00:00Z",
  "results": [
    {
      "type": "sma",
      "params": {"period": 20},
      "lines": {"sma": [{"time": 1700000000, "value": 42300.0}]}
    },
    {
      "type": "macd",
      "params": {"fast": 12, "slow": 26, "signal": 9},
      "lines": {
        "macd": [{"time": 1700000000, "value": 12.34}],
        "signal": [{"time": 1700000000, "value": 11.22}],
        "histogram": [{"time": 1700000000, "value": 1.12}]
      }
    }
  ]
}
```

Validation: 5–5000 candles, strictly ascending unique `time`, finite values,
`timeframe` ∈ {1m 5m 15m 30m 1h 4h 1d 1w}, 1–12 indicators. Errors: `400`
(bad params) / `413` (body > 2 MB) / `422` (schema).

### `GET /health`

```json
{ "status": "healthy" }
```

Interactive docs at `/docs`.

## Run locally

```bash
python -m venv .venv
uv pip install -p .venv -r requirements-dev.txt   # or: .venv/Scripts/pip install -r requirements-dev.txt
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

> On Windows make sure you use a **64-bit** Python — pandas/numpy no longer
> ship 32-bit wheels (`uv python install 3.12` gives you one).

## Test

```bash
.venv/Scripts/python -m pytest tests -q
```

## Deploy (Render)

`render.yaml` at the repo root already defines this service:

```yaml
services:
  - type: web
    name: python-indicators
    runtime: python
    rootDir: python-indicators
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
```

Then point the Go gateway at it:

| Env var on the Go API service | Value                          |
| ----------------------------- | ------------------------------ |
| `INDICATOR_SERVICE_URL`       | `https://python-indicators.onrender.com` |

The gateway pings `/health` every minute to keep the free instance warm; add
an uptime monitor (e.g. cron-job.org) if you want 24/7 wakefulness.

## Docker

```bash
docker build -t cryptolytic-indicators python-indicators/
docker run --rm -p 8000:8000 cryptolytic-indicators
```
