package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/models"
)

type AlertRepo struct {
	pool *pgxpool.Pool
}

func NewAlertRepo(pool *pgxpool.Pool) *AlertRepo {
	return &AlertRepo{pool: pool}
}

func (r *AlertRepo) ListByUser(ctx context.Context, userID string) ([]models.Alert, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, symbol, condition, target, status, last_trigger, created_at, updated_at
		FROM alerts WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list alerts: %w", err)
	}
	defer rows.Close()

	out := []models.Alert{}
	for rows.Next() {
		var a models.Alert
		if err := rows.Scan(&a.ID, &a.UserID, &a.Symbol, &a.Condition, &a.Target, &a.Status, &a.LastTrigger, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan alert: %w", err)
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *AlertRepo) Create(ctx context.Context, a *models.Alert) (*models.Alert, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO alerts (user_id, symbol, condition, target, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, symbol, condition, target, status, last_trigger, created_at, updated_at`,
		a.UserID, a.Symbol, a.Condition, a.Target, a.Status,
	).Scan(&a.ID, &a.UserID, &a.Symbol, &a.Condition, &a.Target, &a.Status, &a.LastTrigger, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create alert: %w", err)
	}
	return a, nil
}

func (r *AlertRepo) GetByID(ctx context.Context, id, userID string) (*models.Alert, error) {
	var a models.Alert
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, symbol, condition, target, status, last_trigger, created_at, updated_at
		FROM alerts WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&a.ID, &a.UserID, &a.Symbol, &a.Condition, &a.Target, &a.Status, &a.LastTrigger, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get alert: %w", err)
	}
	return &a, nil
}

func (r *AlertRepo) Update(ctx context.Context, a *models.Alert) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE alerts
		SET symbol = $3, condition = $4, target = $5, status = $6, updated_at = now()
		WHERE id = $1 AND user_id = $2`,
		a.ID, a.UserID, a.Symbol, a.Condition, a.Target, a.Status)
	if err != nil {
		return fmt.Errorf("update alert: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AlertRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM alerts WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete alert: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
