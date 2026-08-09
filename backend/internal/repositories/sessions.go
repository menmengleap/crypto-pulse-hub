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

type SessionRepo struct {
	pool *pgxpool.Pool
}

func NewSessionRepo(pool *pgxpool.Pool) *SessionRepo {
	return &SessionRepo{pool: pool}
}

func (r *SessionRepo) Create(ctx context.Context, s *models.Session) error {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`,
		s.UserID, s.RefreshTokenHash, s.UserAgent, s.IP, s.ExpiresAt,
	).Scan(&s.ID, &s.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

// GetByRefreshHash returns the session for a refresh token if it is still valid.
func (r *SessionRepo) GetByRefreshHash(ctx context.Context, hash string) (*models.Session, error) {
	var s models.Session
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, refresh_token_hash, user_agent, ip, expires_at, revoked_at, created_at
		FROM sessions
		WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
		hash,
	).Scan(&s.ID, &s.UserID, &s.RefreshTokenHash, &s.UserAgent, &s.IP, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return &s, nil
}

func (r *SessionRepo) Revoke(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	return nil
}

func (r *SessionRepo) RevokeAllForUser(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	if err != nil {
		return fmt.Errorf("revoke user sessions: %w", err)
	}
	return nil
}

func (r *SessionRepo) DeleteExpired(ctx context.Context, before time.Time) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM sessions WHERE (revoked_at IS NOT NULL OR expires_at < $1) AND created_at < $1`, before)
	if err != nil {
		return fmt.Errorf("delete expired sessions: %w", err)
	}
	return nil
}
