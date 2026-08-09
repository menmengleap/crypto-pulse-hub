-- OAuth (Google / GitHub) sign-in support.
-- OAuth-only accounts have no password (password_hash is NULL); they can only
-- sign in through their provider. Email/password accounts can link an OAuth
-- identity later (oauth_provider + oauth_provider_id set on the same row).

ALTER TABLE users
    ADD COLUMN oauth_provider    VARCHAR(20),
    ADD COLUMN oauth_provider_id VARCHAR(255);

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX idx_users_oauth
    ON users (oauth_provider, oauth_provider_id)
    WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;
