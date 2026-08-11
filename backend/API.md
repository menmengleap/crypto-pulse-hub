# Cryptolytic Analytics API

Base URL: `http://localhost:8080` (Docker) · All routes are under `/api`.

**Read-only analytics platform.** No trading, deposits, withdrawals or wallet APIs exist.

---

## Response format

Success:

```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

Error:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "resource not found" } }
```

Error codes: `INVALID_REQUEST`, `VALIDATION_ERROR`, `UNAUTHORIZED`,
`INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `INVALID_RESET_TOKEN`,
`EMAIL_TAKEN`, `INVALID_CONDITION`, `INVALID_STATUS`, `INVALID_TIMEFRAME`,
`INVALID_RESET_TOKEN`, `RATE_LIMITED`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.

Validation failures return `422` with a field map in `data`:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "request failed validation" },
  "data": { "email": "must be a valid email address" }
}
```

## Authentication

All auth routes accept `application/json`. Passwords must be ≥ 8 chars, mixed case,
and contain a digit.

### POST /api/auth/register

```json
{ "email": "a@example.com", "password": "SecurePass1", "name": "Alice" }
```

`201` → `{ user, tokens: { accessToken, refreshToken, tokenType, expiresIn } }`

### POST /api/auth/login

```json
{ "email": "a@example.com", "password": "SecurePass1" }
```

`200` → same shape as register. `401 INVALID_CREDENTIALS` on failure.

### POST /api/auth/refresh

```json
{ "refreshToken": "..." }
```

Rotates the session and returns a fresh token pair. `401 INVALID_REFRESH_TOKEN` if
revoked or expired.

### POST /api/auth/logout

```json
{ "refreshToken": "..." }
```

Revokes the session. Returns `{ "loggedOut": true }`.

### POST /api/auth/forgot-password

```json
{ "email": "a@example.com" }
```

Always returns `200` (no user enumeration). In development the `resetToken` is included
in the response for testing; production sends it by email.

### POST /api/auth/reset-password

```json
{ "token": "...", "newPassword": "NewSecurePass1" }
```

`200 { "passwordReset": true }`. Revokes all of the user's sessions.

---

## Authenticated user

Send `Authorization: Bearer <accessToken>` on these routes.

### GET /api/me

`200` → `{ user, profile, preferences }`

### PATCH /api/me

```json
{ "name": "Alice", "email": "alice@example.com" }
```

### PATCH /api/me/preferences

```json
{
  "defaultCurrency": "USD",
  "defaultTimeframe": "4h",
  "theme": "dark",
  "notifications": { "alerts": true },
  "chartPreferences": { "lineStyle": "candles" }
}
```

### GET /api/sessions

Active device sessions for the authenticated user, newest first (max 20). The
session that issued the request is flagged `current: true`. Login, register and
OAuth callbacks store the browser's `User-Agent` and client IP on each session.

```json
{
  "success": true,
  "data": [
    { "id": "...", "userAgent": "Mozilla/5.0 ... Chrome/126 ...", "ip": "203.0.113.7",
      "current": true, "createdAt": "2026-08-11T09:00:00Z", "expiresAt": "2026-09-10T09:00:00Z" }
  ]
}
```

### DELETE /api/sessions/:id

Revokes one of the user's sessions (sessions belonging to another user return
`404`). `200 { "revoked": true }`.

### POST /api/sessions/revoke-others

Signs out every other device, keeping the current session. `200 { "revoked": true }`.

---

## Markets (public, read-only)

### GET /api/markets

List of active markets joined with their latest snapshot. `meta` omitted; order is by
market cap.

### GET /api/markets/:symbol

`GET /api/markets/BTC` → `{ asset, snapshot, indicators[] }`

### GET /api/markets/:symbol/history?timeframe=4h&limit=200

OHLCV candles, ascending by time. `timeframe` ∈ `1m 5m 15m 30m 1h 4h 1d 1w` (default `4h`).
`limit` default `200`, max `1000`. Response meta: `{ symbol, timeframe, count }`.

### GET /api/markets/:symbol/indicators?timeframe=4h

With `timeframe`: one indicator set. Without: all timeframes.

```json
{
  "success": true,
  "data": {
    "assetId": "...", "symbol": "BTC", "timeframe": "4h",
    "rsi": 58.2, "macd": 123.4, "macdSignal": 118.0, "macdHist": 5.4,
    "ema20": 64100, "ema50": 63500, "ema200": 59000,
    "atr": 420, "stochastic": 61.0, "obv": 123456,
    "support": 62800, "resistance": 65900, "trend": "Bullish", "momentum": "Moderate"
  }
}
```

### GET /api/market-overview

`{ metrics, sentiment }` — global market cap, volume, dominance, open interest, index,
fear & greed, plus the composite sentiment reading.

### GET /api/market-cap · /api/market-volume · /api/open-interest

`{ current, change, history[] }` — 90 days of daily values.

### GET /api/bitcoin-dominance

`{ current: { btc, eth, other }, history[] }`

### GET /api/sentiment

`{ composite, label, drivers }` where `drivers` is a map of named sub-scores.

### GET /api/fear-greed

`{ current: { value, label }, history[] }` (90 daily readings).

### GET /api/heatmap

Array of `{ symbol, name, sector, change24h, marketCap }` tiles.

---

## Technical indicators (public)

Indicators are computed by the **Python microservice** (`python-indicators/`)
and proxied through this gateway. The browser sends OHLCV candles + indicator
specs; the gateway forwards the payload verbatim and returns the series.

### POST /api/indicators/calculate

```json
{
  "symbol": "BTC",
  "timeframe": "4h",
  "candles": [
    { "time": 1700000000, "open": 42000.0, "high": 42500.0, "low": 41800.0, "close": 42300.0, "volume": 1200.5 }
  ],
  "indicators": [
    { "type": "sma", "params": { "period": 20 } },
    { "type": "macd", "params": { "fast": 12, "slow": 26, "signal": 9 } }
  ]
}
```

- `candles`: 5–5000 bars, ascending unique `time` (epoch seconds).
- `indicators`: 1–12 specs. Types: `sma ema rsi macd bollinger atr stochastic obv`.
- `200` → `{ symbol, timeframe, computedAt, results[] }` where `results[i]`
  matches the request order: `{ type, params, lines: { <label>: [{ time, value }] } }`
  (warm-up values dropped).
- `400 VALIDATION_ERROR` — bad timeframe or indicator params.
- `503 SERVICE_UNAVAILABLE` — the Python service is unreachable; the chart
  degrades to candles only. The gateway never fabricates indicator data.

```json
{
  "success": true,
  "data": {
    "symbol": "BTC", "timeframe": "4h", "computedAt": "2026-08-10T12:00:00Z",
    "results": [
      { "type": "sma", "params": { "period": 20 },
        "lines": { "sma": [ { "time": 1700000000, "value": 42300.0 } ] } }
    ]
  }
}
```

---

## Developer API keys & usage (v1)

The **User Developer** product surface. Users create API keys from the console
(`/api-keys`), then call the v1 calculate endpoint with the key as a Bearer
token from their own systems. Only the SHA-256 hash of a key is stored; the
full secret is returned exactly once, at creation.

### GET /api/v1/indicators (public)

The machine-readable indicator catalog — the same 8 indicators the Python
microservice implements, with params, lines, formulas and warm-up notes:

```json
{
  "indicators": [
    { "type": "sma", "name": "Simple Moving Average", "short": "SMA",
      "category": "Trend", "description": "...",
      "params": [ { "key": "period", "label": "Period", "default": 20, "min": 2, "max": 500 } ],
      "lines": ["sma"], "formula": "...", "warmup": "...", "interpretation": "..." }
  ],
  "timeframes": ["1m","5m","15m","30m","1h","4h","1d","1w"],
  "limits": { "minCandles": 5, "maxCandles": 5000, "minIndicators": 1, "maxIndicators": 12 }
}
```

### GET /api/v1/status (public)

`{ "status": "ok", "service": "cryptolytic-indicator-api", "version": "1.0.0", "timeframes": [...], "time": "..." }`

### POST /api/v1/indicators/calculate

Identical request/response contract to the legacy public route, but requires a
credential — either a platform access token (`Authorization: Bearer <JWT>`, as
the signed-in console sends) or a dashboard **API key**
(`Authorization: Bearer cl_live_…`). Every call is logged to `api_key_usage`
(per key) for the usage dashboard. Errors are flat `{ "code", "message" }`
objects (no envelope).

### GET /api/v1/api-keys (JWT)

```json
{ "success": true, "data": { "keys": [
  { "id": "...", "name": "production-bot", "maskedKey": "cl_live_Ab12Cd…f9zA",
    "status": "active", "lastUsedAt": "2026-08-11T09:00:00Z", "createdAt": "..." }
] } }
```

### POST /api/v1/api-keys (JWT)

```json
{ "name": "production-bot" }
```

`201` → `{ success, data: { id, name, maskedKey, status, createdAt, secret } }` —
`secret` is shown only once.

### DELETE /api/v1/api-keys/:id (JWT)

Revokes the key. `200 { "revoked": true }`. Keys belonging to other users
return `404`.

### GET /api/v1/usage (JWT)

Aggregate request stats for the authenticated user (raw object, no envelope):

```json
{
  "totalRequests": 1420, "successfulRequests": 1411, "failedRequests": 9,
  "avgLatencyMs": 38.2, "activeKeys": 2,
  "series": [ { "time": "2026-08-11", "requests": 412, "errors": 1 } ]
}
```

`?range=` accepts `24h` (default), `7d`, `30d`, `90d` or any Go duration.

---

## Watchlists (auth)

### GET /api/watchlists · POST /api/watchlists

```json
{ "name": "Core majors" }
```

`POST` → `201` with the created watchlist.

### PATCH /api/watchlists/:id · DELETE /api/watchlists/:id

```json
{ "name": "Renamed" }
```

### POST /api/watchlists/:id/assets

```json
{ "symbol": "BTC" }
```

### DELETE /api/watchlists/:id/assets/:symbol

---

## Saved analyses (auth)

### GET /api/analyses · POST /api/analyses

```json
{ "title": "BTC 4H note", "symbol": "BTC", "timeframe": "4h", "notes": "...", "tag": "Bullish" }
```

### GET /api/analyses/:id · DELETE /api/analyses/:id

---

## Alerts (auth, analysis-only)

Alerts only *notify* — they never place orders.

### GET /api/alerts · POST /api/alerts

```json
{ "symbol": "BTC", "condition": "price_above", "target": "$70,000" }
```

Conditions: `price_above`, `price_below`, `rsi_above`, `rsi_below`, `ema_cross`,
`sentiment_change`.

### PATCH /api/alerts/:id · DELETE /api/alerts/:id

`PATCH` accepts any of `symbol`, `condition`, `target`, `status`
(`active | paused | triggered | expired`).

---

## News (public)

### GET /api/news

Query params:

| Param | Description |
| --- | --- |
| `category` | category name or slug |
| `symbol` | only news mentioning this asset |
| `search` | title/excerpt text search |
| `page`, `limit` | pagination (default 1 / 20, max 100) |
| `sort` | `newest` (default), `oldest`, `bullish`, `bearish` |

Meta: `{ total, page, limit }`.

### GET /api/news/:id · GET /api/news/categories · GET /api/news/trending

---

## AI analysis (auth)

Rule-based structured analysis from the market data provider. It contains no guarantees
and no predictions of future returns.

### POST /api/ai/analyze

```json
{ "symbol": "BTC", "timeframe": "4h" }
```

`201` → `{ id, symbol, timeframe, model, input, output, createdAt }` where `output` is:

```json
{
  "symbol": "BTC", "timeframe": "4h", "bias": "bullish",
  "confidence": "moderate", "summary": "...",
  "keyLevels": { "support": 62800, "resistance": 65900, "pivot": 64350 },
  "momentum": { "rsi": 58.2, "stochastic": 61.0, "label": "Moderate" },
  "trend": "Bullish", "volume24h": 12345678, "lastClose": 64800, "atr": 420,
  "marketContext": { "sentiment": 68, "change24h": 2.1 },
  "disclaimer": "This is algorithmic market analysis for research and education only...",
  "generatedAt": "..."
}
```

### GET /api/ai/analyses · GET /api/ai/analyses/:id

The authenticated user's analyses.

---

## Realtime WebSocket

### GET /api/ws/markets

Upgrades to a WebSocket. Server pushes a frame every 2 seconds:

```json
{ "type": "market_snapshot", "at": "2026-08-09T09:00:00Z", "data": [ { "symbol": "BTC", "price": 64800.0, "change24h": 2.1, "volume24h": 1.2e10, "marketCap": 1.3e12, "rsi": 58.2 } ] }
```

---

## Health

### GET /api/health

`200 { success: true, data: { status: "ok", database: true } }` — `503` when the
database is unreachable.

---

## Deployment notes (Render)

1. Deploy the Python microservice first: **Dashboard → New → Blueprint** → this
   repo → `render.yaml` creates `python-indicators` (or create a Web Service with
   root dir `python-indicators`). Verify `https://python-indicators.onrender.com/health`
   returns `{"status":"healthy"}`.
2. On the `cryptolytic-api` service set
   `INDICATOR_SERVICE_URL=https://python-indicators.onrender.com` and redeploy.
   The gateway only proxies through this URL — the browser never talks to Python
   directly. Without it the gateway dials the local default and returns
   `503 SERVICE_UNAVAILABLE` on `/api/indicators/calculate`.
3. Keep-alive: the gateway pings the Python `/health` endpoint every 60 s while
   it is awake. For free-tier cold starts (both services spin down after ~15 min
   idle) add an external monitor (e.g. UptimeRobot) hitting both `/health`
   endpoints every 5 min.

---

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `APP_ENV` | `development` | `production` enables stricter checks |
| `DATABASE_URL` | — | PostgreSQL DSN (**required**) |
| `JWT_SECRET` | — | JWT signing secret (**required**, ≥ 32 chars in prod) |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | `720h` | Refresh token / session lifetime |
| `CORS_ORIGINS` | `http://localhost:3001,http://localhost:5173` | Allowed origins |
| `RATE_LIMIT_RPS` | `20` | Requests per second per IP |
| `RATE_LIMIT_BURST` | `40` | Burst allowance per IP |
| `SEED_ON_STARTUP` | `true` | Seed mock data when the DB is empty |
| `WS_ENABLED` | `true` | Enable the WebSocket market stream |
| `INDICATOR_SERVICE_URL` | `http://localhost:8000` | Base URL of the Python indicator microservice |
