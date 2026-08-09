-- Cryptolytic Analytics backend schema.
-- Market analysis only: no trading, wallet or payment tables exist by design.

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                      VARCHAR(320) NOT NULL UNIQUE,
    password_hash              TEXT        NOT NULL,
    name                       VARCHAR(120) NOT NULL DEFAULT '',
    role                       VARCHAR(20)  NOT NULL DEFAULT 'user',
    is_active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    password_reset_token_hash  TEXT,
    password_reset_expires_at  TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE profiles (
    user_id      UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    display_name VARCHAR(120) NOT NULL DEFAULT '',
    bio          TEXT         NOT NULL DEFAULT '',
    avatar_url   TEXT         NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
    user_id           UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    default_currency  VARCHAR(10)   NOT NULL DEFAULT 'USD',
    default_timeframe VARCHAR(10)   NOT NULL DEFAULT '4h',
    theme             VARCHAR(20)   NOT NULL DEFAULT 'dark',
    notifications     JSONB         NOT NULL DEFAULT '{}'::jsonb,
    chart_preferences JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    refresh_token_hash TEXT        NOT NULL UNIQUE,
    user_agent         TEXT        NOT NULL DEFAULT '',
    ip                 TEXT,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- User content
-- ---------------------------------------------------------------------------

CREATE TABLE watchlists (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(120) NOT NULL,
    is_default BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlists_user_id ON watchlists (user_id);

CREATE TABLE watchlist_items (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID        NOT NULL REFERENCES watchlists (id) ON DELETE CASCADE,
    symbol       VARCHAR(32) NOT NULL,
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (watchlist_id, symbol)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items (watchlist_id);

CREATE TABLE saved_charts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    symbol     VARCHAR(32) NOT NULL,
    timeframe  VARCHAR(10) NOT NULL DEFAULT '4h',
    config     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_charts_user_id ON saved_charts (user_id);

CREATE TABLE saved_analyses (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    symbol     VARCHAR(32) NOT NULL,
    timeframe  VARCHAR(10) NOT NULL DEFAULT '4h',
    notes      TEXT        NOT NULL DEFAULT '',
    tag        VARCHAR(40) NOT NULL DEFAULT 'Neutral',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_analyses_user_id ON saved_analyses (user_id);

-- Analysis-only alerts; never place orders.
CREATE TABLE alerts (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    symbol       VARCHAR(32)  NOT NULL,
    condition    VARCHAR(40)  NOT NULL,
    target       VARCHAR(64)  NOT NULL DEFAULT '',
    status       VARCHAR(20)  NOT NULL DEFAULT 'active',
    last_trigger TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_user_id ON alerts (user_id);

-- ---------------------------------------------------------------------------
-- Market data
-- ---------------------------------------------------------------------------

CREATE TABLE assets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol      VARCHAR(32) NOT NULL UNIQUE,
    name        VARCHAR(120) NOT NULL,
    pair        VARCHAR(32) NOT NULL,
    image_url   TEXT        NOT NULL DEFAULT '',
    sector      VARCHAR(40) NOT NULL DEFAULT 'Other',
    color       VARCHAR(16) NOT NULL DEFAULT '#888888',
    base_price  DOUBLE PRECISION NOT NULL,
    volatility  DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_symbol ON assets (symbol);

CREATE TABLE market_snapshots (
    id         BIGSERIAL PRIMARY KEY,
    asset_id   UUID        NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    price      DOUBLE PRECISION NOT NULL,
    change_24h DOUBLE PRECISION NOT NULL DEFAULT 0,
    change_7d  DOUBLE PRECISION NOT NULL DEFAULT 0,
    high_24h   DOUBLE PRECISION NOT NULL DEFAULT 0,
    low_24h    DOUBLE PRECISION NOT NULL DEFAULT 0,
    volume_24h DOUBLE PRECISION NOT NULL DEFAULT 0,
    market_cap DOUBLE PRECISION NOT NULL DEFAULT 0,
    rsi        DOUBLE PRECISION NOT NULL DEFAULT 50,
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (asset_id)
);

CREATE INDEX idx_market_snapshots_timestamp ON market_snapshots (timestamp);

CREATE TABLE market_history (
    id        BIGSERIAL PRIMARY KEY,
    asset_id  UUID        NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    timeframe VARCHAR(8)  NOT NULL,
    ts        TIMESTAMPTZ NOT NULL,
    open      DOUBLE PRECISION NOT NULL,
    high      DOUBLE PRECISION NOT NULL,
    low       DOUBLE PRECISION NOT NULL,
    close     DOUBLE PRECISION NOT NULL,
    volume    DOUBLE PRECISION NOT NULL,
    UNIQUE (asset_id, timeframe, ts)
);

CREATE INDEX idx_market_history_asset_time ON market_history (asset_id, timeframe, ts DESC);

CREATE TABLE technical_indicators (
    id         BIGSERIAL PRIMARY KEY,
    asset_id   UUID        NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
    timeframe  VARCHAR(8)  NOT NULL,
    rsi        DOUBLE PRECISION NOT NULL DEFAULT 50,
    macd       DOUBLE PRECISION NOT NULL DEFAULT 0,
    macd_signal DOUBLE PRECISION NOT NULL DEFAULT 0,
    macd_hist  DOUBLE PRECISION NOT NULL DEFAULT 0,
    ema20      DOUBLE PRECISION NOT NULL DEFAULT 0,
    ema50      DOUBLE PRECISION NOT NULL DEFAULT 0,
    ema200     DOUBLE PRECISION NOT NULL DEFAULT 0,
    atr        DOUBLE PRECISION NOT NULL DEFAULT 0,
    stochastic DOUBLE PRECISION NOT NULL DEFAULT 50,
    obv        DOUBLE PRECISION NOT NULL DEFAULT 0,
    support    DOUBLE PRECISION NOT NULL DEFAULT 0,
    resistance DOUBLE PRECISION NOT NULL DEFAULT 0,
    trend      VARCHAR(24)  NOT NULL DEFAULT 'Neutral',
    momentum   VARCHAR(24)  NOT NULL DEFAULT 'Weak',
    timestamp  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (asset_id, timeframe)
);

CREATE INDEX idx_technical_indicators_asset ON technical_indicators (asset_id);

CREATE TABLE market_metrics (
    id                   BIGSERIAL PRIMARY KEY,
    total_market_cap     DOUBLE PRECISION NOT NULL DEFAULT 0,
    market_cap_change    DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_volume         DOUBLE PRECISION NOT NULL DEFAULT 0,
    volume_change        DOUBLE PRECISION NOT NULL DEFAULT 0,
    btc_dominance        DOUBLE PRECISION NOT NULL DEFAULT 0,
    eth_dominance        DOUBLE PRECISION NOT NULL DEFAULT 0,
    other_dominance      DOUBLE PRECISION NOT NULL DEFAULT 0,
    open_interest        DOUBLE PRECISION NOT NULL DEFAULT 0,
    open_interest_change DOUBLE PRECISION NOT NULL DEFAULT 0,
    altseason_index      DOUBLE PRECISION NOT NULL DEFAULT 0,
    market_index         DOUBLE PRECISION NOT NULL DEFAULT 0,
    market_index_change  DOUBLE PRECISION NOT NULL DEFAULT 0,
    fear_greed           INTEGER       NOT NULL DEFAULT 50,
    fear_greed_label     VARCHAR(32)   NOT NULL DEFAULT 'Neutral',
    timestamp            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE market_sentiment (
    id        BIGSERIAL PRIMARY KEY,
    composite INTEGER     NOT NULL DEFAULT 50,
    label     VARCHAR(40) NOT NULL DEFAULT 'Neutral',
    drivers   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fear_greed_history (
    id    BIGSERIAL PRIMARY KEY,
    date  DATE        NOT NULL UNIQUE,
    value INTEGER     NOT NULL,
    label VARCHAR(32) NOT NULL DEFAULT 'Neutral'
);

CREATE TABLE bitcoin_dominance (
    id    BIGSERIAL PRIMARY KEY,
    date  DATE    NOT NULL UNIQUE,
    btc   DOUBLE PRECISION NOT NULL,
    eth   DOUBLE PRECISION NOT NULL,
    other DOUBLE PRECISION NOT NULL
);

CREATE TABLE market_cap_history (
    id    BIGSERIAL PRIMARY KEY,
    date  DATE    NOT NULL UNIQUE,
    value DOUBLE PRECISION NOT NULL
);

CREATE TABLE volume_history (
    id    BIGSERIAL PRIMARY KEY,
    date  DATE    NOT NULL UNIQUE,
    value DOUBLE PRECISION NOT NULL
);

CREATE TABLE open_interest_history (
    id    BIGSERIAL PRIMARY KEY,
    date  DATE    NOT NULL UNIQUE,
    value DOUBLE PRECISION NOT NULL
);

-- ---------------------------------------------------------------------------
-- News
-- ---------------------------------------------------------------------------

CREATE TABLE news_categories (
    id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE news (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(300) NOT NULL,
    excerpt      TEXT        NOT NULL DEFAULT '',
    body         JSONB       NOT NULL DEFAULT '[]'::jsonb,
    source       VARCHAR(120) NOT NULL DEFAULT '',
    category_id  UUID        NOT NULL REFERENCES news_categories (id) ON DELETE RESTRICT,
    sentiment    VARCHAR(16) NOT NULL DEFAULT 'neutral',
    image_url    TEXT        NOT NULL DEFAULT '',
    read_time    VARCHAR(32) NOT NULL DEFAULT '3 min read',
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_published_at ON news (published_at DESC);
CREATE INDEX idx_news_category ON news (category_id);

CREATE TABLE news_assets (
    news_id UUID        NOT NULL REFERENCES news (id) ON DELETE CASCADE,
    symbol  VARCHAR(32) NOT NULL,
    PRIMARY KEY (news_id, symbol)
);

CREATE INDEX idx_news_assets_symbol ON news_assets (symbol);

-- ---------------------------------------------------------------------------
-- AI
-- ---------------------------------------------------------------------------

CREATE TABLE ai_analyses (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    symbol     VARCHAR(32) NOT NULL,
    timeframe  VARCHAR(10) NOT NULL DEFAULT '4h',
    input      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    output     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    model      VARCHAR(64) NOT NULL DEFAULT 'cryptolytic-rules-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_analyses_user_id ON ai_analyses (user_id);
