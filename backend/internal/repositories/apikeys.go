package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/models"
)

// APIKeyRepo persists developer API keys and their usage log.
type APIKeyRepo struct {
	pool *pgxpool.Pool
}

func NewAPIKeyRepo(pool *pgxpool.Pool) *APIKeyRepo {
	return &APIKeyRepo{pool: pool}
}

const apiKeyColumns = `id, user_id, name, key_hash, masked_key, status, last_used_at, created_at, updated_at`

func scanAPIKey(row pgx.Row) (models.APIKey, error) {
	var k models.APIKey
	err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyHash, &k.MaskedKey, &k.Status, &k.LastUsedAt, &k.CreatedAt, &k.UpdatedAt)
	return k, err
}

// Create inserts a new key and returns the stored row.
func (r *APIKeyRepo) Create(ctx context.Context, k *models.APIKey) (*models.APIKey, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO api_keys (user_id, name, key_hash, masked_key)
		VALUES ($1, $2, $3, $4)
		RETURNING `+apiKeyColumns,
		k.UserID, k.Name, k.KeyHash, k.MaskedKey,
	).Scan(&k.ID, &k.UserID, &k.Name, &k.KeyHash, &k.MaskedKey, &k.Status, &k.LastUsedAt, &k.CreatedAt, &k.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create api key: %w", err)
	}
	return k, nil
}

// ListByUser returns the user's keys, newest first.
func (r *APIKeyRepo) ListByUser(ctx context.Context, userID string) ([]models.APIKey, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+apiKeyColumns+` FROM api_keys
		WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	defer rows.Close()

	out := []models.APIKey{}
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyHash, &k.MaskedKey, &k.Status, &k.LastUsedAt, &k.CreatedAt, &k.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan api key: %w", err)
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

// GetByHash resolves an active key from its SHA-256 hash. Used by the
// developer-auth middleware to authenticate raw keys without storing them.
func (r *APIKeyRepo) GetByHash(ctx context.Context, keyHash string) (*models.APIKey, error) {
	k, err := scanAPIKey(r.pool.QueryRow(ctx, `
		SELECT `+apiKeyColumns+` FROM api_keys
		WHERE key_hash = $1 AND status = 'active'`, keyHash))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get api key by hash: %w", err)
	}
	return &k, nil
}

// GetByIDAndUser returns a key owned by the given user (or ErrNotFound).
func (r *APIKeyRepo) GetByIDAndUser(ctx context.Context, id, userID string) (*models.APIKey, error) {
	k, err := scanAPIKey(r.pool.QueryRow(ctx, `
		SELECT `+apiKeyColumns+` FROM api_keys
		WHERE id = $1 AND user_id = $2`, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get api key by id: %w", err)
	}
	return &k, nil
}

// Revoke marks a key as revoked (soft delete keeps the usage log intact).
func (r *APIKeyRepo) Revoke(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE api_keys SET status = 'revoked', updated_at = now()
		WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("revoke api key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// TouchLastUsed stamps a key's last_used_at timestamp.
func (r *APIKeyRepo) TouchLastUsed(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE api_keys SET last_used_at = now(), updated_at = now() WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("touch api key: %w", err)
	}
	return nil
}

// RecordUsage inserts one row into the usage log.
func (r *APIKeyRepo) RecordUsage(ctx context.Context, u *models.APIKeyUsage) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO api_key_usage (api_key_id, user_id, indicator_type, status, status_code, latency_ms)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		u.APIKeyID, u.UserID, u.IndicatorType, u.Status, u.StatusCode, u.LatencyMs)
	if err != nil {
		return fmt.Errorf("record api usage: %w", err)
	}
	return nil
}

// CountActiveKeys returns the number of active keys owned by the user.
func (r *APIKeyRepo) CountActiveKeys(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM api_keys WHERE user_id = $1 AND status = 'active'`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count active keys: %w", err)
	}
	return n, nil
}

// UsageSince aggregates the user's logged calls since the given time into a
// UsageStats snapshot (totals + per-day series, newest day first).
func (r *APIKeyRepo) UsageSince(ctx context.Context, userID string, since time.Time, activeKeys int) (*models.UsageStats, error) {
	stats := &models.UsageStats{ActiveKeys: activeKeys, Series: []models.UsagePoint{}}

	err := r.pool.QueryRow(ctx, `
		SELECT
			count(*)                                   AS total,
			count(*) FILTER (WHERE status = 'ok')      AS ok,
			count(*) FILTER (WHERE status = 'error')   AS errors,
			COALESCE(avg(latency_ms) FILTER (WHERE latency_ms > 0), 0) AS avg_ms
		FROM api_key_usage
		WHERE user_id = $1 AND created_at >= $2`, userID, since,
	).Scan(&stats.TotalRequests, &stats.SuccessfulRequests, &stats.FailedRequests, &stats.AvgLatencyMs)
	if err != nil {
		return nil, fmt.Errorf("aggregate api usage: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
		       count(*)                                             AS requests,
		       count(*) FILTER (WHERE status = 'error')             AS errors
		FROM api_key_usage
		WHERE user_id = $1 AND created_at >= $2
		GROUP BY day ORDER BY day DESC`, userID, since)
	if err != nil {
		return nil, fmt.Errorf("usage series: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var p models.UsagePoint
		if err := rows.Scan(&p.Time, &p.Requests, &p.Errors); err != nil {
			return nil, fmt.Errorf("scan usage series: %w", err)
		}
		stats.Series = append(stats.Series, p)
	}
	return stats, rows.Err()
}
