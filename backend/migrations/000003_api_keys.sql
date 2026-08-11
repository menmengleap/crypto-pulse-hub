-- Developer API keys + usage logging.
--
-- Users of the Cryptolytic Indicator API (the "User Developer" product) create
-- API keys from their dashboard, then call POST /api/v1/indicators/calculate
-- with the key as a Bearer token. Only the hash of the key is stored; the raw
-- secret is shown exactly once, at creation.
--
-- api_key_usage records one row per v1 calculate call (JWT-authenticated or
-- key-authenticated) so the dashboard can show request counts, success rate,
-- latency and per-day series.

CREATE TABLE api_keys (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    key_hash      TEXT         NOT NULL UNIQUE,
    masked_key    VARCHAR(40)  NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',   -- active | revoked
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);

CREATE TABLE api_key_usage (
    id             BIGSERIAL    PRIMARY KEY,
    api_key_id     UUID         REFERENCES api_keys (id) ON DELETE SET NULL,
    user_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    indicator_type VARCHAR(64)  NOT NULL DEFAULT '',        -- comma-joined types from the request
    status         VARCHAR(16)  NOT NULL DEFAULT 'ok',       -- ok | error
    status_code    INTEGER      NOT NULL DEFAULT 200,
    latency_ms     INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_key_usage_user_created ON api_key_usage (user_id, created_at DESC);
CREATE INDEX idx_api_key_usage_key_created  ON api_key_usage (api_key_id, created_at DESC);
