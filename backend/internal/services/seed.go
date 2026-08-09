package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/marketdata"
	"cryptolytic/backend/mocks"
)

// SeedService populates the database on first startup from the market data
// provider. The frontend never learns whether data came from here or a real
// exchange API — it only talks to the HTTP API.
type SeedService struct {
	pool     *pgxpool.Pool
	provider marketdata.MarketDataProvider
}

func NewSeedService(pool *pgxpool.Pool, provider marketdata.MarketDataProvider) *SeedService {
	return &SeedService{pool: pool, provider: provider}
}

// SeedIfEmpty seeds all reference and market tables when the database is empty.
func (s *SeedService) SeedIfEmpty(ctx context.Context) error {
	var count int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM assets`).Scan(&count); err != nil {
		return fmt.Errorf("check assets table: %w", err)
	}
	if count > 0 {
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin seed: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	ids, err := s.seedAssets(ctx, tx)
	if err != nil {
		return err
	}
	if err := s.seedHistory(ctx, tx, ids); err != nil {
		return err
	}
	if err := s.seedIndicators(ctx, tx, ids); err != nil {
		return err
	}
	if err := s.seedGlobal(ctx, tx); err != nil {
		return err
	}
	if err := s.seedNews(ctx, tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit seed: %w", err)
	}
	return nil
}

func (s *SeedService) seedAssets(ctx context.Context, tx pgx.Tx) (map[string]string, error) {
	ids := map[string]string{}
	for _, a := range s.provider.Assets() {
		var id string
		err := tx.QueryRow(ctx, `
			INSERT INTO assets (symbol, name, pair, image_url, sector, color, base_price, volatility)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id`,
			a.Symbol, a.Name, a.Pair, a.ImageURL, a.Sector, a.Color, a.BasePrice, a.Volatility,
		).Scan(&id)
		if err != nil {
			return nil, fmt.Errorf("insert asset %s: %w", a.Symbol, err)
		}
		ids[a.Symbol] = id
	}

	// Latest snapshots.
	snapshots, err := s.provider.Snapshots()
	if err != nil {
		return nil, fmt.Errorf("generate snapshots: %w", err)
	}
	for _, snap := range snapshots {
		if _, err := tx.Exec(ctx, `
			INSERT INTO market_snapshots
				(asset_id, price, change_24h, change_7d, high_24h, low_24h, volume_24h, market_cap, rsi, timestamp)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
			ids[snap.Symbol], snap.Price, snap.Change24h, snap.Change7d, snap.High24h, snap.Low24h, snap.Volume24h, snap.MarketCap, snap.RSI,
		); err != nil {
			return nil, fmt.Errorf("insert snapshot %s: %w", snap.Symbol, err)
		}
	}
	return ids, nil
}

func (s *SeedService) seedHistory(ctx context.Context, tx pgx.Tx, ids map[string]string) error {
	perTimeframe := map[string]int{
		"1m": 120, "5m": 120, "15m": 120, "30m": 100,
		"1h": 200, "4h": 200, "1d": 150, "1w": 104,
	}
	for tf, count := range perTimeframe {
		rows := [][]any{}
		for _, a := range s.provider.Assets() {
			candles, err := s.provider.Candles(a.Symbol, tf, count)
			if err != nil {
				return fmt.Errorf("candles %s %s: %w", a.Symbol, tf, err)
			}
			for _, c := range candles {
				rows = append(rows, []any{ids[a.Symbol], tf, time.Unix(c.Timestamp, 0).UTC(), c.Open, c.High, c.Low, c.Close, c.Volume})
			}
		}
		if len(rows) == 0 {
			continue
		}
		if _, err := tx.CopyFrom(ctx, pgx.Identifier{"market_history"},
			[]string{"asset_id", "timeframe", "ts", "open", "high", "low", "close", "volume"},
			pgx.CopyFromRows(rows),
		); err != nil {
			return fmt.Errorf("copy market history %s: %w", tf, err)
		}
	}
	return nil
}

func (s *SeedService) seedIndicators(ctx context.Context, tx pgx.Tx, ids map[string]string) error {
	for tf := range marketdata.SupportedTimeframes {
		for _, a := range s.provider.Assets() {
			ind, err := s.provider.Indicators(a.Symbol, tf)
			if err != nil {
				return fmt.Errorf("indicators %s %s: %w", a.Symbol, tf, err)
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO technical_indicators
					(asset_id, timeframe, rsi, macd, macd_signal, macd_hist, ema20, ema50, ema200,
					 atr, stochastic, obv, support, resistance, trend, momentum, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())`,
				ids[a.Symbol], tf, ind.RSI, ind.MACD, ind.MACDSignal, ind.MACDHist, ind.EMA20, ind.EMA50, ind.EMA200,
				ind.ATR, ind.Stochastic, ind.OBV, ind.Support, ind.Resistance, ind.Trend, ind.Momentum,
			); err != nil {
				return fmt.Errorf("insert indicator %s %s: %w", a.Symbol, tf, err)
			}
		}
	}
	return nil
}

func (s *SeedService) seedGlobal(ctx context.Context, tx pgx.Tx) error {
	g := s.provider.GlobalMetrics()
	if _, err := tx.Exec(ctx, `
		INSERT INTO market_metrics
			(total_market_cap, market_cap_change, total_volume, volume_change, btc_dominance, eth_dominance,
			 other_dominance, open_interest, open_interest_change, altseason_index, market_index, market_index_change,
			 fear_greed, fear_greed_label, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())`,
		g.TotalMarketCap, g.MarketCapChange, g.TotalVolume, g.VolumeChange, g.BTCDominance, g.ETHDominance,
		g.OtherDominance, g.OpenInterest, g.OpenInterestChange, g.AltseasonIndex, g.MarketIndex, g.MarketIndexChange,
		g.FearGreed, g.FearGreedLabel,
	); err != nil {
		return fmt.Errorf("insert market metrics: %w", err)
	}

	sentiment, err := s.provider.Sentiment()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO market_sentiment (composite, label, drivers, timestamp)
		VALUES ($1, $2, $3, now())`, sentiment.Composite, sentiment.Label, sentiment.Drivers); err != nil {
		return fmt.Errorf("insert sentiment: %w", err)
	}

	days := 90
	if err := s.seedDaily(ctx, tx, days); err != nil {
		return err
	}
	return nil
}

func (s *SeedService) seedDaily(ctx context.Context, tx pgx.Tx, days int) error {
	fng, err := s.provider.FearGreedHistory(days)
	if err != nil {
		return err
	}
	fngRows := [][]any{}
	for _, p := range fng {
		fngRows = append(fngRows, []any{p.Date, p.Value, p.Label})
	}
	if len(fngRows) > 0 {
		if _, err := tx.CopyFrom(ctx, pgx.Identifier{"fear_greed_history"}, []string{"date", "value", "label"}, pgx.CopyFromRows(fngRows)); err != nil {
			return fmt.Errorf("copy fear greed: %w", err)
		}
	}

	dom, err := s.provider.DominanceHistory(days)
	if err != nil {
		return err
	}
	domRows := [][]any{}
	for _, p := range dom {
		domRows = append(domRows, []any{p.Date, p.BTC, p.ETH, p.Other})
	}
	if len(domRows) > 0 {
		if _, err := tx.CopyFrom(ctx, pgx.Identifier{"bitcoin_dominance"}, []string{"date", "btc", "eth", "other"}, pgx.CopyFromRows(domRows)); err != nil {
			return fmt.Errorf("copy dominance: %w", err)
		}
	}

	if err := s.copyDaily(ctx, tx, "market_cap_history", s.provider.MarketCapHistory, days); err != nil {
		return err
	}
	if err := s.copyDaily(ctx, tx, "volume_history", s.provider.VolumeHistory, days); err != nil {
		return err
	}
	if err := s.copyDaily(ctx, tx, "open_interest_history", s.provider.OpenInterestHistory, days); err != nil {
		return err
	}
	return nil
}

type dailyFn func(days int) ([]marketdata.HistoryPoint, error)

func (s *SeedService) copyDaily(ctx context.Context, tx pgx.Tx, table string, fn dailyFn, days int) error {
	points, err := fn(days)
	if err != nil {
		return err
	}
	rows := [][]any{}
	for _, p := range points {
		rows = append(rows, []any{p.Date, p.Value})
	}
	if len(rows) == 0 {
		return nil
	}
	if _, err := tx.CopyFrom(ctx, pgx.Identifier{table}, []string{"date", "value"}, pgx.CopyFromRows(rows)); err != nil {
		return fmt.Errorf("copy %s: %w", table, err)
	}
	return nil
}

func (s *SeedService) seedNews(ctx context.Context, tx pgx.Tx) error {
	// Categories first.
	categoryIDs := map[string]string{}
	seen := map[string]bool{}
	for _, n := range mocks.News {
		if seen[n.Category] {
			continue
		}
		seen[n.Category] = true
		var id string
		err := tx.QueryRow(ctx, `
			INSERT INTO news_categories (name, slug) VALUES ($1, $2)
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
			RETURNING id`, n.Category, slugify(n.Category)).Scan(&id)
		if err != nil {
			return fmt.Errorf("insert category %s: %w", n.Category, err)
		}
		categoryIDs[n.Category] = id
	}

	for _, n := range mocks.News {
		var newsID string
		publishedAt := time.Now().UTC().Add(-time.Duration(n.HoursAgo) * time.Hour)
		err := tx.QueryRow(ctx, `
			INSERT INTO news (title, excerpt, body, source, category_id, sentiment, image_url, read_time, published_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING id`,
			n.Title, n.Excerpt, n.Body, n.Source, categoryIDs[n.Category], n.Sentiment, n.ImageURL, n.ReadTime, publishedAt,
		).Scan(&newsID)
		if err != nil {
			return fmt.Errorf("insert news %q: %w", n.Title, err)
		}
		for _, symbol := range n.Assets {
			if _, err := tx.Exec(ctx, `
				INSERT INTO news_assets (news_id, symbol) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
				newsID, symbol); err != nil {
				return fmt.Errorf("insert news asset %s: %w", symbol, err)
			}
		}
	}
	return nil
}

func slugify(s string) string {
	out := make([]rune, 0, len(s))
	for _, r := range s {
		switch {
		case r >= 'A' && r <= 'Z':
			out = append(out, r-'A'+'a')
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			out = append(out, r)
		default:
			out = append(out, '-')
		}
	}
	return string(out)
}
