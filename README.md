# Cryptolytic — Market Intelligence Terminal

A production-ready **read-only market analytics platform**. Cryptolytic is a
three-service system that turns public market data (crypto, forex, stocks) and
fresh news into a dense, professional analyst terminal — charts, technical
indicators, AI-style analysis, watchlists, alerts, sentiment and a research
section — with **no trading, orders, wallets, deposits or withdrawals** anywhere
in the stack. By design.

```
┌─────────────────┐        ┌──────────────────┐        ┌───────────────────┐
│  React Frontend │ ─────▶ │   Go API Gateway │ ─────▶ │   Python Service  │
│  (TanStack      │  /api  │  (chi + pgx)     │  /api/ │   (FastAPI,       │
│   Start + Vite) │ ◀───── │                  │  v1/   │    pandas/numpy)  │
└─────────────────┘        └───────┬──────────┘        └───────────────────┘
                                   │
                         ┌─────────┴──────────┐
                         │  PostgreSQL (auth, │
                         │  watchlists, saved │
                         │  analyses, alerts) │
                         └────────────────────┘
                                   │
              Market providers (server-side only, never the browser):
              Crypto → Binance · Forex → exchangerate-api ⇄ Frankfurter
              Stocks → Yahoo Finance ⇄ Finnhub · Research → Finnhub
```

---

## Services

| Service | Stack | Live URL | Purpose |
| --- | --- | --- | --- |
| `frontend` (`src/`) | TanStack Start (React 19), Vite, Tailwind CSS 4, shadcn/ui, Zustand, lightweight-charts | `cryptolytic-frontend.onrender.com` | Marketing site + analyst console UI |
| `backend` (`backend/`) | Go 1.26, chi, pgx (PostgreSQL), JWT, gorilla/websocket | `cryptolytic-api.onrender.com` | REST + WebSocket API gateway, market data, auth |
| `python-indicators` (`python-indicators/`) | FastAPI, pandas, numpy (no indicator libraries) | `python-indicators.onrender.com` | On-demand technical indicator math |

---

## Feature overview

### Marketing site (public)
- Homepage with a single smart **Open terminal** CTA — signed-out visitors go to
  `/register`, signed-in users go straight into the console.
- **New** page with release notes, pricing, and a **Finnhub Realtime** section:
  Economic/earnings **calendar**, **company fundamentals** (PE, EPS growth, beta,
  52-week range, target price…) and **Market News** panels.
- Blog (changelog), team, testimonials, audience map, legal pages (terms,
  policy, disclaimer), support FAQ, coming-soon.

### Console (authenticated)
- **Market overview** — TradingView/CoinMarketCap-inspired compact dashboard:
  charcoal theme (`#0F172A`), dense ticker table, gradient sparklines, pill
  change badges, live badges.
- **Spot / Derivatives / Assets / Screener** — per-asset tables, sorting,
  filtering, search, pagination.
- **Advanced chart** (`lightweight-charts`) — candlesticks + volume, 8
  timeframes, drawing overlay, **indicator overlay & sub-pane rendering**
  (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic, OBV) computed by the Python
  microservice through the Go gateway.
- **Compare / Watchlist / Saved analyses / Alerts** — real database-backed,
  analysis-only alerts (price/RSA/EMA-cross conditions) that notify but never
  trade.
- **Fear & Greed / Sentiment / Market cycle / Bitcoin dominance / Heatmap** —
  market-wide analytics pages.
- **AI analysis** — rule-based structured market analysis generated server-side.
- **Profile & Settings** — real user data from the database (name, avatar with
  upload, member-since date) shown in the sidebar and navbar.
- **News** — categorized headlines, article pages, sentiment badges.

### Live market data (server-side only)
Clients **never call providers directly** — the browser only ever talks to the Go
backend (`User → Frontend → Backend → Provider`). The backend prefetches into an
in-memory cache on background tickers and serves every frontend request from it:

| Asset class | Provider(s) | Refresh cadence |
| --- | --- | --- |
| Crypto | Binance (public REST) | every 10 s |
| Forex | exchangerate-api ⇄ Frankfurter (ECB) | every 30 s |
| Stocks | Yahoo Finance ⇄ Finnhub | every 60 s |

- **Automatic failover**: if the active provider fails on consecutive refresh
  cycles it flips to the backup; a successful refresh resets the counter, so
  forex and stocks keep switching back and forth as required.
- **Graceful degradation**: when every provider is unreachable the API serves
  deterministic mock data — the API never goes down with a third party.
- **Bulk endpoints** (`/api/live/markets`, `/api/live/sparks`, …) replace the
  old per-symbol fan-out, eliminating 429 rate-limit bursts from the frontend.
- **Finnhub research endpoints** (`/api/finnhub/*`) with TTL caches and
  single-flight fetch protection.

---

## Repository layout

```
.
├── src/                      # React frontend (TanStack Start, file-based routing)
│   ├── routes/               #   one .tsx per page (market, chart, news, settings…)
│   ├── components/           #   ui/ (shadcn), layout/, market/, chart/
│   └── lib/                  #   api client, auth store, realtime, global-market data
├── backend/                  # Go API gateway
│   ├── cmd/api/main.go       #   entrypoint: config → db → migrate → seed → http/ws
│   ├── internal/
│   │   ├── marketdata/       #   live providers, failover, mock fallback, Finnhub
│   │   ├── handlers/  middleware/  routes/  repositories/  services/  ws/
│   │   ├── config/  database/  models/  indicators/
│   └── migrations/           #   embedded SQL schema
├── python-indicators/        # FastAPI microservice
│   ├── app/                  #   main.py, indicators.py (pure math), schemas.py
│   └── tests/
├── render.yaml               # Render blueprint for the Python service
├── nitro.config.ts           # production /api/* proxy → Go backend
└── vite.config.ts            # dev proxy /api → local Go backend (:8787)
```

---

## Quick start (local development)

### 1. Backend (Go) + PostgreSQL

```bash
cd backend
cp .env.example .env          # set DATABASE_URL + JWT_SECRET (≥ 32 chars)
docker compose up --build     # Postgres + API on :8080
# or without Docker:
#   PORT=8787 go run ./cmd/api
```

On first boot the server runs embedded SQL migrations, seeds the database with
deterministic mock data (only when empty), then starts the HTTP API and the
WebSocket stream. Health: `GET /api/health`.

### 2. Python indicator microservice

```bash
cd python-indicators
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
# smoke test
curl -s http://localhost:8000/health        # {"status":"healthy"}
```

### 3. Frontend

```bash
npm i
npm run dev                     # Vite dev server on :8080, /api proxied to :8787
```

> Locally the Go API runs on `:8787` (the port the Vite proxy expects) and the
> frontend dev server on `:8080`. Production builds proxy `/api/*` through Nitro
> to the deployed backend origin (see `nitro.config.ts`).

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL DSN (**required**) |
| `JWT_SECRET` | — | JWT signing secret (**required**, ≥ 32 chars in prod) |
| `PORT` / `APP_ENV` | `8080` / `development` | HTTP port, strictness mode |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `720h` | Token lifetimes |
| `CORS_ORIGINS` | localhost origins | Allowed browser origins |
| `RATE_LIMIT_RPS` / `RATE_LIMIT_BURST` | `20` / `40` | Per-IP token bucket |
| `LIVE_DATA_ENABLED` | `true` | Enable live provider prefetching |
| `CRYPTO_REFRESH_SECONDS` | `10` | 5–10 s window |
| `FOREX_REFRESH_SECONDS` | `30` | 15–30 s window |
| `STOCK_REFRESH_SECONDS` | `60` | 30–60 s window |
| `FINNHUB_API_KEY` / `EXCHANGERATE_API_KEY` | — | Provider keys (never sent to the client) |
| `INDICATOR_SERVICE_URL` | `http://localhost:8000` | Python microservice base URL |
| `WS_ENABLED` / `SEED_ON_STARTUP` | `true` | WebSocket stream / first-boot seeding |

### Frontend (`.env` / Render env)

| Variable | Description |
| --- | --- |
| `VITE_API_BASE` | Optional; absolute backend origin (e.g. `https://cryptolytic-api.onrender.com`). Defaults to the same-origin `/api` proxy. |
| `NITRO_API_PROXY` | Production `/api` proxy target (defaults to the deployed backend). |

### Python service

| Variable | Description |
| --- | --- |
| `PORT` | Uvicorn port (Render sets it automatically) |

---

## API surface

The full reference lives in **[`backend/API.md`](./backend/API.md)**. Every
response uses the envelope `{ success, data, meta }` / `{ success, error }`.
Highlights:

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password` |
| Me | `GET/PATCH /api/me`, `PATCH /api/me/preferences` |
| Live markets | `GET /api/live/markets`, `/api/live/global`, `/api/live/klines`, `/api/live/sparks`, `/api/live/stocks`, `/api/live/forex`, `/api/live/providers` |
| Finnhub research | `GET /api/finnhub/events` (economic ⇄ earnings fallback), `/api/finnhub/fundamentals?symbol=`, `/api/finnhub/news` |
| Indicators | `POST /api/indicators/calculate` (proxies to the Python service) |
| Market structure | `/api/market-overview`, `/api/market-cap`, `/api/market-volume`, `/api/open-interest`, `/api/bitcoin-dominance` |
| Sentiment | `/api/sentiment`, `/api/fear-greed`, `/api/heatmap` |
| Watchlists / Analyses / Alerts | CRUD under `/api/watchlists`, `/api/analyses`, `/api/alerts` |
| News | `GET /api/news`, `/api/news/:id`, `/api/news/categories`, `/api/news/trending` |
| AI analysis | `POST /api/ai/analyze`, `GET /api/ai/analyses`, `/api/ai/analyses/:id` |
| Realtime | `GET /api/ws/markets` (WebSocket, `market_snapshot` every 2 s) |
| Health | `GET /api/health` and `GET /health` (monitor alias) |

---

## Technical indicators pipeline

```
React chart (OHLCV + indicator specs)
        │  POST /api/indicators/calculate
        ▼
Go API gateway ── forwards payload verbatim ──▶ FastAPI /api/v1/indicators/calculate
        ▲                                            │  pandas/numpy from scratch
        └───────────── computed series ◀─────────────┘
```

- **Pure math**: SMA, EMA, RSI (Wilder), MACD, Bollinger, ATR, Stochastic, OBV —
  implemented from first principles in `python-indicators/app/indicators.py`.
  No ta-lib, no tti.
- Warm-up NaNs are stripped; returned series align to candle timestamps.
- The gateway never fabricates indicator data: if the Python service is
  unreachable it returns `503 SERVICE_UNAVAILABLE` and the chart degrades
  gracefully to candles only.

---

## Authentication & session handling

- **bcrypt** password hashing; short-lived **JWT access tokens** (15 m) plus
  opaque, revocable **refresh tokens** stored hashed in the `sessions` table.
- OAuth sign-in with **Google & GitHub**; provider callbacks hit the frontend
  origin and are proxied to the backend (`nitro.config.ts`).
- Frontend API client auto-injects `Authorization: Bearer <token>`, refreshes
  the access token exactly once on `401` (single-flight), retries the request,
  and purges the session only when the refresh token itself is dead.
- **Session gate**: route guards wait for storage hydration *and* a backend
  `/api/me` validation before deciding where to redirect — closing the classic
  `/login ⇄ /market` infinite redirect loop. Validation is cached 60 s per
  token so console navigation never bursts `/me` calls, and network errors
  (Render cold starts) never log users out.
- A `/health` poll (45 s) keeps the free-tier instance warm and surfaces
  backend status in the UI.

---

## Deployment (Render)

The platform runs as three Render services; `render.yaml` manages the Python
microservice blueprint (the Go API and frontend were deployed via the Render
dashboard).

1. **Python microservice** — blueprint service `python-indicators`
   (root dir `python-indicators`, `uvicorn app.main:app`). Verify
   `https://python-indicators.onrender.com/health`.
2. **Go API** — set `INDICATOR_SERVICE_URL=https://python-indicators.onrender.com`
   (and the provider keys / `JWT_SECRET` / `DATABASE_URL`) and redeploy.
3. **Frontend** — set `NITRO_API_PROXY=https://cryptolytic-api.onrender.com`.
   Pushing to `main` auto-deploys.

**Cold starts**: free-tier instances spin down after ~15 min idle. The gateway
pings the Python `/health` every 60 s while awake, and the frontend polls
`/health` every 45 s — add an external uptime monitor hitting both health
endpoints every 5 min for 24/7 wakefulness.

---

## Security

- Parameterized queries everywhere (pgx); bcrypt hashing; JWT verification with
  issuer + HMAC-method checks; per-IP token-bucket rate limiting; CORS
  allow-list; hardened headers (nosniff, framing DENY, Referrer-Policy, CSP,
  no-store). Provider API keys stay server-side. `JWT_SECRET` ≥ 32 chars is
  enforced in production.

## Testing

```bash
cd backend && go test ./... && go vet ./...
cd python-indicators && .venv/Scripts/python -m pytest tests -q
cd .. && npx tsc --noEmit && npm run build
```

---

## Disclaimer

Market data from third-party providers is for **research and education only**.
Nothing in this system — including the rule-based AI analysis — constitutes
financial advice or a prediction of future returns.

---

This project was built with [Lovable](https://lovable.dev) and developed further
in this repository. Continue developing in the [Lovable editor](https://lovable.dev/projects/46e5018a-4144-4f10-9c9a-1b28548a2c2f); every change
committed to `main` syncs back into Lovable.
