// Package marketdata defines the MarketDataProvider interface — the single
// contract the rest of the backend uses to obtain market information.
//
// Business logic never knows whether data comes from the mock provider, the
// database, or a future real exchange API. Swapping the provider is the only
// change required to go live.
package marketdata

import "time"

// SupportedTimeframes maps the canonical timeframe labels to durations.
var SupportedTimeframes = map[string]time.Duration{
	"1m":  time.Minute,
	"5m":  5 * time.Minute,
	"15m": 15 * time.Minute,
	"30m": 30 * time.Minute,
	"1h":  time.Hour,
	"4h":  4 * time.Hour,
	"1d":  24 * time.Hour,
	"1w":  7 * 24 * time.Hour,
}

// Candle is a single OHLCV bar (timestamps in unix seconds).
type Candle struct {
	Timestamp int64   `json:"timestamp"`
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    float64 `json:"volume"`
}

// AssetMeta is a catalog entry for one market.
type AssetMeta struct {
	Symbol     string  `json:"symbol"`
	Name       string  `json:"name"`
	Pair       string  `json:"pair"`
	Sector     string  `json:"sector"`
	Color      string  `json:"color"`
	ImageURL   string  `json:"imageUrl"`
	BasePrice  float64 `json:"basePrice"`
	Volatility float64 `json:"volatility"`
}

// Snapshot is the current ticker state for one market.
type Snapshot struct {
	Symbol    string  `json:"symbol"`
	Price     float64 `json:"price"`
	Change24h float64 `json:"change24h"`
	Change7d  float64 `json:"change7d"`
	High24h   float64 `json:"high24h"`
	Low24h    float64 `json:"low24h"`
	Volume24h float64 `json:"volume24h"`
	MarketCap float64 `json:"marketCap"`
	RSI       float64 `json:"rsi"`
}

// IndicatorSet is the computed technical state for one symbol/timeframe.
type IndicatorSet struct {
	RSI        float64 `json:"rsi"`
	MACD       float64 `json:"macd"`
	MACDSignal float64 `json:"macdSignal"`
	MACDHist   float64 `json:"macdHist"`
	EMA20      float64 `json:"ema20"`
	EMA50      float64 `json:"ema50"`
	EMA200     float64 `json:"ema200"`
	ATR        float64 `json:"atr"`
	Stochastic float64 `json:"stochastic"`
	OBV        float64 `json:"obv"`
	Support    float64 `json:"support"`
	Resistance float64 `json:"resistance"`
	Trend      string  `json:"trend"`
	Momentum   string  `json:"momentum"`
}

// GlobalMetrics is a point-in-time view of the whole market.
type GlobalMetrics struct {
	TotalMarketCap     float64 `json:"totalMarketCap"`
	MarketCapChange    float64 `json:"marketCapChange"`
	TotalVolume        float64 `json:"totalVolume"`
	VolumeChange       float64 `json:"volumeChange"`
	BTCDominance       float64 `json:"btcDominance"`
	ETHDominance       float64 `json:"ethDominance"`
	OtherDominance     float64 `json:"otherDominance"`
	OpenInterest       float64 `json:"openInterest"`
	OpenInterestChange float64 `json:"openInterestChange"`
	AltseasonIndex     float64 `json:"altseasonIndex"`
	MarketIndex        float64 `json:"marketIndex"`
	MarketIndexChange  float64 `json:"marketIndexChange"`
	FearGreed          int     `json:"fearGreed"`
	FearGreedLabel     string  `json:"fearGreedLabel"`
}

// CompositeSentiment is the aggregate market emotion reading.
type CompositeSentiment struct {
	Composite int            `json:"composite"`
	Label     string         `json:"label"`
	Drivers   map[string]any `json:"drivers"`
}

// FearGreedPoint is one daily fear & greed reading.
type FearGreedPoint struct {
	Date  time.Time `json:"date"`
	Value int       `json:"value"`
	Label string    `json:"label"`
}

// DominancePoint is one daily BTC/ETH/Other dominance reading.
type DominancePoint struct {
	Date  time.Time `json:"date"`
	BTC   float64   `json:"btc"`
	ETH   float64   `json:"eth"`
	Other float64   `json:"other"`
}

// HistoryPoint is one daily value (market cap / volume / open interest).
type HistoryPoint struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

// HeatmapCell is one tile of the market heatmap.
type HeatmapCell struct {
	Symbol    string  `json:"symbol"`
	Name      string  `json:"name"`
	Sector    string  `json:"sector"`
	Change24h float64 `json:"change24h"`
	MarketCap float64 `json:"marketCap"`
}

// MarketDataProvider is the abstraction over all market data sources.
type MarketDataProvider interface {
	Assets() []AssetMeta
	Snapshot(symbol string) (Snapshot, error)
	Snapshots() ([]Snapshot, error)
	Candles(symbol, timeframe string, limit int) ([]Candle, error)
	Indicators(symbol, timeframe string) (IndicatorSet, error)
	GlobalMetrics() GlobalMetrics
	Sentiment() (CompositeSentiment, error)
	FearGreedHistory(days int) ([]FearGreedPoint, error)
	DominanceHistory(days int) ([]DominancePoint, error)
	MarketCapHistory(days int) ([]HistoryPoint, error)
	VolumeHistory(days int) ([]HistoryPoint, error)
	OpenInterestHistory(days int) ([]HistoryPoint, error)
	Heatmap() ([]HeatmapCell, error)
}
