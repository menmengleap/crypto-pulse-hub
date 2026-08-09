package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/models"
)

type WatchlistRepo struct {
	pool *pgxpool.Pool
}

func NewWatchlistRepo(pool *pgxpool.Pool) *WatchlistRepo {
	return &WatchlistRepo{pool: pool}
}

func (r *WatchlistRepo) ListByUser(ctx context.Context, userID string) ([]models.Watchlist, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, is_default, created_at, updated_at
		FROM watchlists WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list watchlists: %w", err)
	}
	defer rows.Close()

	out := []models.Watchlist{}
	for rows.Next() {
		var w models.Watchlist
		if err := rows.Scan(&w.ID, &w.UserID, &w.Name, &w.IsDefault, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan watchlist: %w", err)
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

func (r *WatchlistRepo) Create(ctx context.Context, userID, name string, isDefault bool) (*models.Watchlist, error) {
	var w models.Watchlist
	err := r.pool.QueryRow(ctx, `
		INSERT INTO watchlists (user_id, name, is_default)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, name, is_default, created_at, updated_at`,
		userID, name, isDefault,
	).Scan(&w.ID, &w.UserID, &w.Name, &w.IsDefault, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create watchlist: %w", err)
	}
	return &w, nil
}

func (r *WatchlistRepo) Update(ctx context.Context, id, userID, name string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE watchlists SET name = $3, updated_at = now() WHERE id = $1 AND user_id = $2`,
		id, userID, name)
	if err != nil {
		return fmt.Errorf("update watchlist: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *WatchlistRepo) Delete(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM watchlists WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete watchlist: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// OwnedByUser verifies a watchlist belongs to a user (used by item routes).
func (r *WatchlistRepo) OwnedByUser(ctx context.Context, id, userID string) (bool, error) {
	var one int
	err := r.pool.QueryRow(ctx,
		`SELECT 1 FROM watchlists WHERE id = $1 AND user_id = $2`, id, userID).Scan(&one)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check watchlist ownership: %w", err)
	}
	return true, nil
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

func (r *WatchlistRepo) ListItems(ctx context.Context, watchlistID string) ([]models.WatchlistItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, watchlist_id, symbol, sort_order, created_at, updated_at
		FROM watchlist_items WHERE watchlist_id = $1 ORDER BY sort_order ASC, created_at ASC`, watchlistID)
	if err != nil {
		return nil, fmt.Errorf("list watchlist items: %w", err)
	}
	defer rows.Close()

	out := []models.WatchlistItem{}
	for rows.Next() {
		var it models.WatchlistItem
		if err := rows.Scan(&it.ID, &it.WatchlistID, &it.Symbol, &it.SortOrder, &it.CreatedAt, &it.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan watchlist item: %w", err)
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

func (r *WatchlistRepo) AddItem(ctx context.Context, watchlistID, symbol string, sortOrder int) (*models.WatchlistItem, error) {
	var it models.WatchlistItem
	err := r.pool.QueryRow(ctx, `
		INSERT INTO watchlist_items (watchlist_id, symbol, sort_order)
		VALUES ($1, $2, $3)
		ON CONFLICT (watchlist_id, symbol) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = now()
		RETURNING id, watchlist_id, symbol, sort_order, created_at, updated_at`,
		watchlistID, symbol, sortOrder,
	).Scan(&it.ID, &it.WatchlistID, &it.Symbol, &it.SortOrder, &it.CreatedAt, &it.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("add watchlist item: %w", err)
	}
	return &it, nil
}

func (r *WatchlistRepo) RemoveItem(ctx context.Context, watchlistID, symbol string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM watchlist_items WHERE watchlist_id = $1 AND symbol = $2`, watchlistID, symbol)
	if err != nil {
		return fmt.Errorf("remove watchlist item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
