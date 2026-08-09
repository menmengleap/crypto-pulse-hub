package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/models"
)

type AnalysisRepo struct {
	pool *pgxpool.Pool
}

func NewAnalysisRepo(pool *pgxpool.Pool) *AnalysisRepo {
	return &AnalysisRepo{pool: pool}
}

func (r *AnalysisRepo) ListByUser(ctx context.Context, userID string) ([]models.SavedAnalysis, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, title, symbol, timeframe, notes, tag, created_at, updated_at
		FROM saved_analyses WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list analyses: %w", err)
	}
	defer rows.Close()

	out := []models.SavedAnalysis{}
	for rows.Next() {
		var a models.SavedAnalysis
		if err := rows.Scan(&a.ID, &a.UserID, &a.Title, &a.Symbol, &a.Timeframe, &a.Notes, &a.Tag, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan analysis: %w", err)
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *AnalysisRepo) Create(ctx context.Context, a *models.SavedAnalysis) (*models.SavedAnalysis, error) {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO saved_analyses (user_id, title, symbol, timeframe, notes, tag)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, title, symbol, timeframe, notes, tag, created_at, updated_at`,
		a.UserID, a.Title, a.Symbol, a.Timeframe, a.Notes, a.Tag,
	).Scan(&a.ID, &a.UserID, &a.Title, &a.Symbol, &a.Timeframe, &a.Notes, &a.Tag, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create analysis: %w", err)
	}
	return a, nil
}

func (r *AnalysisRepo) GetByID(ctx context.Context, id, userID string) (*models.SavedAnalysis, error) {
	var a models.SavedAnalysis
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, title, symbol, timeframe, notes, tag, created_at, updated_at
		FROM saved_analyses WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&a.ID, &a.UserID, &a.Title, &a.Symbol, &a.Timeframe, &a.Notes, &a.Tag, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get analysis: %w", err)
	}
	return &a, nil
}

func (r *AnalysisRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM saved_analyses WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete analysis: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
