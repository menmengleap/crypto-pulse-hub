# Cryptolytic Analytics Backend

A production-ready **read-only market analytics** API in Go. It provides realtime-grade
market data (via a deterministic mock provider), technical indicators, news, saved
analyses, watchlists, analysis-only alerts and a prepared WebSocket stream.

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

## Architecture: the MarketDataProvider

The backend never hardcodes where market data comes from. Everything reads through one
interface:

```
MarketDataProvider
   ├── MockMarketDataProvider   (default — deterministic, no external services)
   └── FutureRealMarketDataProvider  (plug in a real exchange API later)
```

Swap the implementation in `cmd/api/main.go` and nothing else changes — the HTTP API,
the database seed and the WebSocket hub all keep working. The frontend can never tell
whether data came from the mock, the database or a live exchange.

The mock provider is **deterministic** (seeded RNG): the same symbol always produces the
same candles, indicators and snapshots, which keeps tests and development reproducible.
Candles are generated with a trend-based price walk so they look realistic rather than
random.

## API

Full reference: **[API.md](./API.md)**. Quick overview:

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password` |
| Me | `GET/PATCH /api/me`, `PATCH /api/me/preferences` |
| Markets | `GET /api/markets`, `/api/markets/:symbol`, `/:symbol/history`, `/:symbol/indicators` |
| Market structure | `/api/market-overview`, `/api/market-cap`, `/api/market-volume`, `/api/open-interest`, `/api/bitcoin-dominance` |
| Sentiment | `/api/sentiment`, `/api/fear-greed`, `/api/heatmap` |
| Watchlists | `GET/POST /api/watchlists`, `PATCH/DELETE /api/watchlists/:id`, `POST /api/watchlists/:id/assets`, `DELETE .../assets/:symbol` |
| Saved analyses | `GET/POST /api/analyses`, `GET/DELETE /api/analyses/:id` |
| Alerts (analysis-only) | `GET/POST /api/alerts`, `PATCH/DELETE /api/alerts/:id` |
| News | `GET /api/news`, `/api/news/:id`, `/api/news/categories`, `/api/news/trending` |
| AI analysis | `POST /api/ai/analyze`, `GET /api/ai/analyses`, `GET /api/ai/analyses/:id` |
| Realtime | `GET /api/ws/markets` (WebSocket) |
| Health | `GET /api/health` |

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
