package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/models"
)

type NewsRepo struct {
	pool *pgxpool.Pool
}

func NewNewsRepo(pool *pgxpool.Pool) *NewsRepo {
	return &NewsRepo{pool: pool}
}

// NewsFilter controls list filtering, sorting and pagination.
type NewsFilter struct {
	Category string
	Symbol   string
	Search   string
	Sort     string // newest | oldest | bullish | bearish
	Page     int
	Limit    int
}

const newsSelect = `
	SELECT n.id, n.title, n.excerpt, n.body, n.source, c.name, n.sentiment, n.image_url, n.read_time, n.published_at
	FROM news n
	JOIN news_categories c ON c.id = n.category_id`

func (f NewsFilter) sortClause() string {
	switch f.Sort {
	case "oldest":
		return "n.published_at ASC"
	case "bullish":
		return "CASE n.sentiment WHEN 'bullish' THEN 0 WHEN 'neutral' THEN 1 ELSE 2 END, n.published_at DESC"
	case "bearish":
		return "CASE n.sentiment WHEN 'bearish' THEN 0 WHEN 'neutral' THEN 1 ELSE 2 END, n.published_at DESC"
	default:
		return "n.published_at DESC"
	}
}

func (f NewsFilter) normalized() NewsFilter {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 20
	}
	return f
}

func scanNews(row pgx.Row) (models.News, error) {
	var n models.News
	err := row.Scan(&n.ID, &n.Title, &n.Excerpt, &n.Body, &n.Source, &n.Category, &n.Sentiment, &n.ImageURL, &n.ReadTime, &n.PublishedAt)
	return n, err
}

// List returns matching news plus the total count (before pagination).
func (r *NewsRepo) List(ctx context.Context, f NewsFilter) ([]models.News, int, error) {
	f = f.normalized()
	where := ` WHERE ($1 = '' OR c.slug = $1 OR c.name = $1)
	           AND ($2 = '' OR EXISTS (SELECT 1 FROM news_assets na WHERE na.news_id = n.id AND na.symbol = $2))
	           AND ($3 = '' OR n.title ILIKE '%' || $3 || '%' OR n.excerpt ILIKE '%' || $3 || '%')`
	args := []any{f.Category, f.Symbol, f.Search}

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM news n JOIN news_categories c ON c.id = n.category_id`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count news: %w", err)
	}

	offset := (f.Page - 1) * f.Limit
	rows, err := r.pool.Query(ctx, newsSelect+where+` ORDER BY `+f.sortClause()+` LIMIT $4 OFFSET $5`,
		append(args, f.Limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list news: %w", err)
	}
	defer rows.Close()

	out := []models.News{}
	for rows.Next() {
		n, err := scanNews(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan news: %w", err)
		}
		out = append(out, n)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate news: %w", err)
	}

	if err := r.attachAssets(ctx, out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *NewsRepo) GetByID(ctx context.Context, id string) (*models.News, error) {
	n, err := scanNews(r.pool.QueryRow(ctx, newsSelect+` WHERE n.id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get news: %w", err)
	}
	if err := r.attachAssets(ctx, []models.News{n}); err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NewsRepo) Categories(ctx context.Context) ([]models.NewsCategory, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, slug FROM news_categories ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	defer rows.Close()

	out := []models.NewsCategory{}
	for rows.Next() {
		var c models.NewsCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *NewsRepo) Trending(ctx context.Context, limit int) ([]models.News, error) {
	if limit < 1 || limit > 50 {
		limit = 6
	}
	rows, err := r.pool.Query(ctx, newsSelect+` ORDER BY n.published_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("list trending news: %w", err)
	}
	defer rows.Close()

	out := []models.News{}
	for rows.Next() {
		n, err := scanNews(rows)
		if err != nil {
			return nil, fmt.Errorf("scan news: %w", err)
		}
		out = append(out, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.attachAssets(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *NewsRepo) attachAssets(ctx context.Context, newsItems []models.News) error {
	if len(newsItems) == 0 {
		return nil
	}
	ids := make([]string, 0, len(newsItems))
	index := make(map[string]int, len(newsItems))
	for i := range newsItems {
		index[newsItems[i].ID] = i
		ids = append(ids, newsItems[i].ID)
	}
	rows, err := r.pool.Query(ctx, `SELECT news_id, symbol FROM news_assets WHERE news_id = ANY($1) ORDER BY symbol`, ids)
	if err != nil {
		return fmt.Errorf("query news assets: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var newsID, symbol string
		if err := rows.Scan(&newsID, &symbol); err != nil {
			return fmt.Errorf("scan news asset: %w", err)
		}
		if i, ok := index[newsID]; ok {
			newsItems[i].Assets = append(newsItems[i].Assets, symbol)
		}
	}
	return rows.Err()
}
