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

type MarketRepo struct {
	pool *pgxpool.Pool
}

func NewMarketRepo(pool *pgxpool.Pool) *MarketRepo {
	return &MarketRepo{pool: pool}
}

const listingColumns = `
	a.id, a.symbol, a.name, a.pair, a.image_url, a.sector, a.color,
	COALESCE(s.price, a.base_price), COALESCE(s.change_24h, 0), COALESCE(s.change_7d, 0),
	COALESCE(s.high_24h, 0), COALESCE(s.low_24h, 0), COALESCE(s.volume_24h, 0),
	COALESCE(s.market_cap, 0), COALESCE(s.rsi, 50), s.timestamp`

func scanListing(row pgx.Row) (models.MarketListing, error) {
	var l models.MarketListing
	var ts *time.Time
	err := row.Scan(&l.ID, &l.Symbol, &l.Name, &l.Pair, &l.ImageURL, &l.Sector, &l.Color,
		&l.Price, &l.Change24h, &l.Change7d, &l.High24h, &l.Low24h, &l.Volume24h, &l.MarketCap, &l.RSI, &ts)
	if ts != nil {
		l.Timestamp = *ts
	}
	return l, err
}

// ListMarkets returns every active asset joined with its latest snapshot.
func (r *MarketRepo) ListMarkets(ctx context.Context) ([]models.MarketListing, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+listingColumns+`
		FROM assets a
		LEFT JOIN market_snapshots s ON s.asset_id = a.id
		WHERE a.is_active = TRUE
		ORDER BY s.market_cap DESC NULLS LAST`)
	if err != nil {
		return nil, fmt.Errorf("list markets: %w", err)
	}
	defer rows.Close()

	out := []models.MarketListing{}
	for rows.Next() {
		l, err := scanListing(rows)
		if err != nil {
			return nil, fmt.Errorf("scan market listing: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *MarketRepo) GetAssetBySymbol(ctx context.Context, symbol string) (*models.Asset, error) {
	var a models.Asset
	err := r.pool.QueryRow(ctx, `
		SELECT id, symbol, name, pair, image_url, sector, color, base_price, volatility, is_active, created_at, updated_at
		FROM assets WHERE symbol = $1`, symbol,
	).Scan(&a.ID, &a.Symbol, &a.Name, &a.Pair, &a.ImageURL, &a.Sector, &a.Color, &a.BasePrice, &a.Volatility, &a.IsActive, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get asset by symbol: %w", err)
	}
	return &a, nil
}

func (r *MarketRepo) GetSnapshot(ctx context.Context, assetID string) (*models.MarketSnapshot, error) {
	var s models.MarketSnapshot
	err := r.pool.QueryRow(ctx, `
		SELECT asset_id, symbol, price, change_24h, change_7d, high_24h, low_24h, volume_24h, market_cap, rsi, timestamp
		FROM market_snapshots s JOIN assets a ON a.id = s.asset_id
		WHERE s.asset_id = $1`, assetID,
	).Scan(&s.AssetID, &s.Symbol, &s.Price, &s.Change24h, &s.Change7d, &s.High24h, &s.Low24h, &s.Volume24h, &s.MarketCap, &s.RSI, &s.Timestamp)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get snapshot: %w", err)
	}
	return &s, nil
}

func (r *MarketRepo) ListCandles(ctx context.Context, assetID, timeframe string, limit int) ([]models.Candle, error) {
	if limit < 1 || limit > 1000 {
		limit = 200
	}
	rows, err := r.pool.Query(ctx, `
		SELECT ts, open, high, low, close, volume
		FROM market_history
		WHERE asset_id = $1 AND timeframe = $2
		ORDER BY ts DESC
		LIMIT $3`, assetID, timeframe, limit)
	if err != nil {
		return nil, fmt.Errorf("list candles: %w", err)
	}
	defer rows.Close()

	out := []models.Candle{}
	for rows.Next() {
		var c models.Candle
		if err := rows.Scan(&c.Timestamp, &c.Open, &c.High, &c.Low, &c.Close, &c.Volume); err != nil {
			return nil, fmt.Errorf("scan candle: %w", err)
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Return in ascending order for charting.
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out, nil
}

// ListIndicators returns all timeframes for an asset.
func (r *MarketRepo) ListIndicators(ctx context.Context, assetID string) ([]models.TechnicalIndicator, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT asset_id, symbol, timeframe, rsi, macd, macd_signal, macd_hist, ema20, ema50, ema200,
		       atr, stochastic, obv, support, resistance, trend, momentum, timestamp
		FROM technical_indicators t JOIN assets a ON a.id = t.asset_id
		WHERE t.asset_id = $1
		ORDER BY t.timeframe`, assetID)
	if err != nil {
		return nil, fmt.Errorf("list indicators: %w", err)
	}
	defer rows.Close()

	out := []models.TechnicalIndicator{}
	for rows.Next() {
		var i models.TechnicalIndicator
		if err := rows.Scan(&i.AssetID, &i.Symbol, &i.Timeframe, &i.RSI, &i.MACD, &i.MACDSignal, &i.MACDHist,
			&i.EMA20, &i.EMA50, &i.EMA200, &i.ATR, &i.Stochastic, &i.OBV, &i.Support, &i.Resistance, &i.Trend, &i.Momentum, &i.Timestamp); err != nil {
			return nil, fmt.Errorf("scan indicator: %w", err)
		}
		out = append(out, i)
	}
	return out, rows.Err()
}

func (r *MarketRepo) GetIndicator(ctx context.Context, assetID, timeframe string) (*models.TechnicalIndicator, error) {
	var i models.TechnicalIndicator
	err := r.pool.QueryRow(ctx, `
		SELECT asset_id, symbol, timeframe, rsi, macd, macd_signal, macd_hist, ema20, ema50, ema200,
		       atr, stochastic, obv, support, resistance, trend, momentum, timestamp
		FROM technical_indicators t JOIN assets a ON a.id = t.asset_id
		WHERE t.asset_id = $1 AND t.timeframe = $2`, assetID, timeframe,
	).Scan(&i.AssetID, &i.Symbol, &i.Timeframe, &i.RSI, &i.MACD, &i.MACDSignal, &i.MACDHist,
		&i.EMA20, &i.EMA50, &i.EMA200, &i.ATR, &i.Stochastic, &i.OBV, &i.Support, &i.Resistance, &i.Trend, &i.Momentum, &i.Timestamp)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get indicator: %w", err)
	}
	return &i, nil
}

// ---------------------------------------------------------------------------
// Global market series
// ---------------------------------------------------------------------------

func (r *MarketRepo) LatestMetrics(ctx context.Context) (*models.MarketMetrics, error) {
	var m models.MarketMetrics
	err := r.pool.QueryRow(ctx, `
		SELECT id, total_market_cap, market_cap_change, total_volume, volume_change, btc_dominance, eth_dominance,
		       other_dominance, open_interest, open_interest_change, altseason_index, market_index, market_index_change,
		       fear_greed, fear_greed_label, timestamp
		FROM market_metrics ORDER BY timestamp DESC LIMIT 1`,
	).Scan(&m.ID, &m.TotalMarketCap, &m.MarketCapChange, &m.TotalVolume, &m.VolumeChange, &m.BTCDominance, &m.ETHDominance,
		&m.OtherDominance, &m.OpenInterest, &m.OpenInterestChange, &m.AltseasonIndex, &m.MarketIndex, &m.MarketIndexChange,
		&m.FearGreed, &m.FearGreedLabel, &m.Timestamp)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get metrics: %w", err)
	}
	return &m, nil
}

func (r *MarketRepo) LatestSentiment(ctx context.Context) (*models.MarketSentiment, error) {
	var s models.MarketSentiment
	err := r.pool.QueryRow(ctx, `
		SELECT id, composite, label, drivers, timestamp
		FROM market_sentiment ORDER BY timestamp DESC LIMIT 1`,
	).Scan(&s.ID, &s.Composite, &s.Label, &s.Drivers, &s.Timestamp)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get sentiment: %w", err)
	}
	return &s, nil
}

func (r *MarketRepo) ListFearGreed(ctx context.Context, days int) ([]models.FearGreedHistory, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, value, label FROM fear_greed_history
		ORDER BY date DESC LIMIT $1`, days)
	if err != nil {
		return nil, fmt.Errorf("list fear greed: %w", err)
	}
	defer rows.Close()

	out := []models.FearGreedHistory{}
	for rows.Next() {
		var f models.FearGreedHistory
		if err := rows.Scan(&f.Date, &f.Value, &f.Label); err != nil {
			return nil, fmt.Errorf("scan fear greed: %w", err)
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *MarketRepo) ListDominance(ctx context.Context, days int) ([]models.BitcoinDominance, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, btc, eth, other FROM bitcoin_dominance
		ORDER BY date DESC LIMIT $1`, days)
	if err != nil {
		return nil, fmt.Errorf("list dominance: %w", err)
	}
	defer rows.Close()

	out := []models.BitcoinDominance{}
	for rows.Next() {
		var d models.BitcoinDominance
		if err := rows.Scan(&d.Date, &d.BTC, &d.ETH, &d.Other); err != nil {
			return nil, fmt.Errorf("scan dominance: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *MarketRepo) ListMarketCapHistory(ctx context.Context, days int) ([]models.MarketCapHistory, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, value FROM market_cap_history ORDER BY date DESC LIMIT $1`, days)
	if err != nil {
		return nil, fmt.Errorf("list market cap history: %w", err)
	}
	defer rows.Close()

	out := []models.MarketCapHistory{}
	for rows.Next() {
		var h models.MarketCapHistory
		if err := rows.Scan(&h.Date, &h.Value); err != nil {
			return nil, fmt.Errorf("scan market cap history: %w", err)
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (r *MarketRepo) ListVolumeHistory(ctx context.Context, days int) ([]models.VolumeHistory, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, value FROM volume_history ORDER BY date DESC LIMIT $1`, days)
	if err != nil {
		return nil, fmt.Errorf("list volume history: %w", err)
	}
	defer rows.Close()

	out := []models.VolumeHistory{}
	for rows.Next() {
		var h models.VolumeHistory
		if err := rows.Scan(&h.Date, &h.Value); err != nil {
			return nil, fmt.Errorf("scan volume history: %w", err)
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

func (r *MarketRepo) ListOpenInterestHistory(ctx context.Context, days int) ([]models.OpenInterestHistory, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT date, value FROM open_interest_history ORDER BY date DESC LIMIT $1`, days)
	if err != nil {
		return nil, fmt.Errorf("list open interest history: %w", err)
	}
	defer rows.Close()

	out := []models.OpenInterestHistory{}
	for rows.Next() {
		var h models.OpenInterestHistory
		if err := rows.Scan(&h.Date, &h.Value); err != nil {
			return nil, fmt.Errorf("scan open interest history: %w", err)
		}
		out = append(out, h)
	}
	return out, rows.Err()
}
