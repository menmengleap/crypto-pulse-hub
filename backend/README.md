# Cryptolytic Analytics Backend

A production-ready **read-only market analytics** API in Go. It provides live market
data (crypto via Binance, forex via exchangerate-api/Frankfurter, stocks via Yahoo
Finance/Finnhub — all fetched server-side with automatic provider failover),
technical indicators, news, saved analyses, watchlists, analysis-only alerts and a
prepared WebSocket stream.

> **Market analysis only.** There is no trading, order execution, wallet management,
> deposits or withdrawals anywhere in this codebase — by design.

---

## Quick start

```bash
cp .env.example .env     # adjust secrets
docker compose up --build
```

The API is then available at `http://localhost:8080`:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/markets
```

On first boot the server:

1. Runs embedded SQL migrations (tracked in `schema_migrations`).
2. Seeds the database from the `MockMarketDataProvider` (idempotent — only when empty).
3. Starts the HTTP API and the WebSocket market stream.

Run without Docker (requires Go 1.24+ and PostgreSQL):

```bash
go run ./cmd/api
```

---

## Project layout

```
cmd/api/                  entrypoint (config → db → migrate → seed → http/ws)
internal/
  config/                 .env / environment configuration
  database/               pgx pool + migration runner
  models/                 table structs
  repositories/           PostgreSQL access (parameterized queries)
  services/               auth, seeding, rule-based AI analysis
  handlers/               HTTP handlers + response envelope
  middleware/             auth, CORS, rate limit, security headers, logging
  routes/                 chi router wiring
  marketdata/             MarketDataProvider interface + mock provider
  ws/                     WebSocket hub (prepared for realtime)
migrations/               SQL schema (embedded in the binary)
mocks/                    deterministic seed catalog (assets, news)
Dockerfile / docker-compose.yml
```

## Architecture: live market data providers

The backend never hardcodes where market data comes from. Everything reads through the
`MarketDataProvider` interface, and providers are chosen in `cmd/api/main.go`:

```
MarketDataProvider
   ├── LiveProvider      (default — crypto via Binance public REST, cached)
   └── MockMarketDataProvider  (deterministic fallback when the network is down)

GlobalProvider (stocks & forex, with automatic failover)
   ├── forex  → exchangerate-api ⇄ Frankfurter (ECB)
   └── stocks → Yahoo Finance   ⇄ Finnhub
```

- **Clients never talk to providers.** All provider traffic originates from the backend;
  the frontend only calls the API (see `/api/live/*` below).
- **Failover is automatic.** If the active provider fails on consecutive refresh cycles
  it flips to the backup; a successful refresh resets the counter, so the two providers
  keep switching back and forth as required.
- **Cadences** match the data's volatility: crypto 10s, forex 30s, stocks 60s (within the
  requested 5–10s / 15–30s / 30–60s ranges). All tunable via env vars.
- The live providers cache in memory and **degrade gracefully** to the deterministic
  mock when a provider is unreachable, so the API never goes down with a third party.

The mock provider is **deterministic** (seeded RNG): the same symbol always produces the
same candles, indicators and snapshots, which keeps tests and development reproducible.
It is used to seed the database on first boot (fast, offline-safe) and as a last-resort
fallback for live endpoints.

## API

Full reference: **[API.md](./API.md)**. Quick overview:

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password` |
| Me | `GET/PATCH /api/me`, `PATCH /api/me/preferences` |
| Live markets | `GET /api/live/markets`, `/api/live/global`, `/api/live/klines?symbol=&timeframe=&limit=`, `/api/live/sparks`, `/api/live/stocks`, `/api/live/forex`, `/api/live/providers` |
| Markets (seeded) | `GET /api/markets`, `/api/markets/:symbol`, `/:symbol/history`, `/:symbol/indicators` |
| Market structure | `/api/market-overview`, `/api/market-cap`, `/api/market-volume`, `/api/open-interest`, `/api/bitcoin-dominance` |
| Sentiment | `/api/sentiment`, `/api/fear-greed`, `/api/heatmap` |
| Watchlists | `GET/POST /api/watchlists`, `PATCH/DELETE /api/watchlists/:id`, `POST /api/watchlists/:id/assets`, `DELETE .../assets/:symbol` |
| Saved analyses | `GET/POST /api/analyses`, `GET/DELETE /api/analyses/:id` |
| Alerts (analysis-only) | `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/:id` |
| News | `GET /api/news`, `/api/news/:id`, `/api/news/categories`, `/api/news/trending` |
| AI analysis | `POST /api/ai/analyze`, `GET /api/ai/analyses`, `GET /api/ai/analyses/:id` |
| Realtime | `GET /api/ws/markets` (WebSocket) |
| Health | `GET /api/health` and `GET /health` (alias for uptime monitors) |

Every response uses the envelope:

```json
{ "success": true, "data": {}, "meta": {} }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

## Authentication

- Passwords are hashed with **bcrypt** (Argon2id is a drop-in alternative in
  `internal/services/auth.go`).
- Short-lived **JWT access tokens** (default 15m) plus opaque, revocable **refresh
  tokens** stored hashed (`sha256`) in the `sessions` table.
- `POST /api/auth/refresh` rotates the session; `logout` revokes it.
- Password reset tokens are single-use, hashed and expire after 1 hour.

## Security

- Parameterized queries everywhere (pgx) — no string-built SQL.
- bcrypt password hashing; no plaintext passwords ever.
- JWT signature verification with issuer and HMAC-method checks.
- Per-IP token-bucket **rate limiting**.
- **CORS** restricted to an allow-list (`CORS_ORIGINS`).
- Hardened headers: `nosniff`, `DENY` framing, `Referrer-Policy`, CSP, no-store cache.
- No secrets in source — everything comes from environment variables.
- `JWT_SECRET` is validated to be ≥ 32 chars in production.

## WebSocket (prepared for realtime)

`GET /api/ws/markets` upgrades to a WebSocket that pushes a `market_snapshot` frame
(current snapshots for every asset) every 2 seconds:

```json
{ "type": "market_snapshot", "at": "...", "data": [ { "symbol": "BTC", "price": 64800.0, ... } ] }
```

The hub is provider-driven, so switching to a real exchange feed later only changes the
provider, not the client contract.

## Environment variables

See [`.env.example`](./.env.example). Required: `DATABASE_URL`, `JWT_SECRET`. Optional:
`PORT`, `APP_ENV`, `JWT_*_TTL`, `CORS_ORIGINS`, `RATE_LIMIT_*`, `SEED_ON_STARTUP`, `WS_ENABLED`.

Live providers: `LIVE_DATA_ENABLED`, `FINNHUB_API_KEY`, `EXCHANGERATE_API_KEY`,
`CRYPTO_REFRESH_SECONDS` (5–10s), `FOREX_REFRESH_SECONDS` (15–30s),
`STOCK_REFRESH_SECONDS` (30–60s). Keys are never sent to the client.

> Note: the free exchangerate-api tier is limited to ~1,500 requests/month. The 30s
> forex cadence would exhaust that quota in under a day — when it does, the failover
> automatically switches to Frankfurter (free/unlimited). Raise the cadence or upgrade
> the plan if you need sustained exchangerate-api coverage.

## Development

```bash
go run ./cmd/api        # run
go test ./...           # unit tests (marketdata determinism/invariants)
go vet ./...            # static analysis
```

Migrations live in `migrations/` as `NNNNNN_name.sql` and run automatically on startup
(and inside Docker). Add a new file with the next sequence number; it will be applied
once and recorded.

## Disclaimer

All data served by the default mock provider is synthetic and for research/education
only. Nothing in this system should be construed as financial advice or a prediction.
