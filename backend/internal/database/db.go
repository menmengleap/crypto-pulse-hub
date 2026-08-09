package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pgx connection pool and verifies it with a ping.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	// Default to prepared statements (extended protocol): parameter values are
	// bound with their declared types, which makes JSONB/JSON parameters and
	// injection protection work correctly. Multi-statement migration files are
	// executed in simple-protocol mode by the migration runner instead.
	cfg.ConnConfig.RuntimeParams = map[string]string{"client_encoding": "UTF8"}
	cfg.MaxConns = 10
	cfg.MinConns = 2

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// ConnectWithRetry retries connecting until the database is reachable, which
// handles docker compose startup ordering.
func ConnectWithRetry(ctx context.Context, url string, attempts int, delay time.Duration) (*pgxpool.Pool, error) {
	var lastErr error
	for i := 0; i < attempts; i++ {
		pool, err := Connect(ctx, url)
		if err == nil {
			return pool, nil
		}
		lastErr = err
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(delay):
		}
	}
	return nil, fmt.Errorf("database not reachable after %d attempts: %w", attempts, lastErr)
}
