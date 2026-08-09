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

var ErrNotFound = errors.New("not found")

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

const userColumns = `id, email, password_hash, name, role, is_active, created_at, updated_at`

func scanUser(row pgx.Row) (models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

// Create inserts a user, profile and default preferences in one transaction.
func (r *UserRepo) Create(ctx context.Context, u *models.User) (*models.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, name, role, is_active, created_at, updated_at`,
		u.Email, u.Password, u.Name,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}

	if _, err := tx.Exec(ctx, `INSERT INTO profiles (user_id) VALUES ($1)`, u.ID); err != nil {
		return nil, fmt.Errorf("insert profile: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_preferences (user_id) VALUES ($1)`, u.ID); err != nil {
		return nil, fmt.Errorf("insert preferences: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE email = $1`, email))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

// ---------------------------------------------------------------------------
// OAuth identities
// ---------------------------------------------------------------------------

// GetByOAuth finds a user by their provider identity.
func (r *UserRepo) GetByOAuth(ctx context.Context, provider, providerID string) (*models.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE oauth_provider = $1 AND oauth_provider_id = $2`,
		provider, providerID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by oauth: %w", err)
	}
	return &u, nil
}

// CreateOAuth creates an OAuth-only user (no password) with their provider
// avatar, profile and default preferences in one transaction.
func (r *UserRepo) CreateOAuth(ctx context.Context, u *models.User, provider, providerID, avatarURL string) (*models.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	err = tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, name, oauth_provider, oauth_provider_id)
		VALUES ($1, '', $2, $3, $4)
		RETURNING id, email, password_hash, name, role, is_active, created_at, updated_at`,
		u.Email, u.Name, provider, providerID,
	).Scan(&u.ID, &u.Email, &u.Password, &u.Name, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert oauth user: %w", err)
	}

	if _, err := tx.Exec(ctx, `INSERT INTO profiles (user_id, avatar_url) VALUES ($1, $2)`, u.ID, avatarURL); err != nil {
		return nil, fmt.Errorf("insert profile: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_preferences (user_id) VALUES ($1)`, u.ID); err != nil {
		return nil, fmt.Errorf("insert preferences: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return u, nil
}

// LinkOAuth attaches a provider identity to an existing email/password user
// (account linking) and records their provider avatar.
func (r *UserRepo) LinkOAuth(ctx context.Context, userID, provider, providerID, avatarURL string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx,
		`UPDATE users SET oauth_provider = $2, oauth_provider_id = $3, updated_at = now() WHERE id = $1`,
		userID, provider, providerID); err != nil {
		return fmt.Errorf("link oauth user: %w", err)
	}
	if avatarURL != "" {
		if _, err := tx.Exec(ctx,
			`UPDATE profiles SET avatar_url = $2, updated_at = now() WHERE user_id = $1`,
			userID, avatarURL); err != nil {
			return fmt.Errorf("link oauth avatar: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *UserRepo) Update(ctx context.Context, id string, name, email string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET name = $2, email = $3, updated_at = now() WHERE id = $1`, id, name, email)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepo) UpdatePassword(ctx context.Context, id, passwordHash string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, id, passwordHash)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

func (r *UserRepo) GetProfile(ctx context.Context, userID string) (*models.Profile, error) {
	p, err := scanProfile(r.pool.QueryRow(ctx,
		`SELECT user_id, display_name, bio, avatar_url, created_at, updated_at FROM profiles WHERE user_id = $1`, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	return &p, nil
}

func scanProfile(row pgx.Row) (models.Profile, error) {
	var p models.Profile
	err := row.Scan(&p.UserID, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *UserRepo) UpdateProfile(ctx context.Context, p *models.Profile) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE profiles SET display_name = $2, bio = $3, avatar_url = $4, updated_at = now()
		WHERE user_id = $1`,
		p.UserID, p.DisplayName, p.Bio, p.AvatarURL)
	if err != nil {
		return fmt.Errorf("update profile: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

func (r *UserRepo) GetPreferences(ctx context.Context, userID string) (*models.UserPreference, error) {
	p, err := scanPreferences(r.pool.QueryRow(ctx, `
		SELECT user_id, default_currency, default_timeframe, theme, notifications, chart_preferences, created_at, updated_at
		FROM user_preferences WHERE user_id = $1`, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get preferences: %w", err)
	}
	return &p, nil
}

func scanPreferences(row pgx.Row) (models.UserPreference, error) {
	var p models.UserPreference
	err := row.Scan(&p.UserID, &p.DefaultCurrency, &p.DefaultTimeframe, &p.Theme, &p.Notifications, &p.ChartPreferences, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *UserRepo) UpdatePreferences(ctx context.Context, p *models.UserPreference) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE user_preferences
		SET default_currency = $2, default_timeframe = $3, theme = $4, notifications = $5, chart_preferences = $6, updated_at = now()
		WHERE user_id = $1`,
		p.UserID, p.DefaultCurrency, p.DefaultTimeframe, p.Theme, p.Notifications, p.ChartPreferences)
	if err != nil {
		return fmt.Errorf("update preferences: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

func (r *UserRepo) SetResetToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE users
		SET password_reset_token_hash = $2, password_reset_expires_at = $3, updated_at = now()
		WHERE id = $1`, userID, tokenHash, expiresAt)
	return err
}

// UserByResetToken returns the user for a password reset token, if unexpired.
func (r *UserRepo) UserByResetToken(ctx context.Context, tokenHash string) (*models.User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx, `
		SELECT `+userColumns+` FROM users
		WHERE password_reset_token_hash = $1 AND password_reset_expires_at > now()`, tokenHash))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by reset token: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) ClearResetToken(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE users
		SET password_reset_token_hash = NULL, password_reset_expires_at = NULL, updated_at = now()
		WHERE id = $1`, userID)
	return err
}
