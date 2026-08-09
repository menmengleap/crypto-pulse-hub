package models

import "time"

// Timestamps is embedded in every table model that has created_at/updated_at.
type Timestamps struct {
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

type User struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Password   string `json:"-"`
	Role       string `json:"role"`
	IsActive   bool   `json:"isActive"`
	Timestamps        // created_at, updated_at
}

type Profile struct {
	UserID      string `json:"userId" db:"user_id"`
	DisplayName string `json:"displayName" db:"display_name"`
	Bio         string `json:"bio"`
	AvatarURL   string `json:"avatarUrl" db:"avatar_url"`
	Timestamps
}

type UserPreference struct {
	UserID           string            `json:"userId" db:"user_id"`
	DefaultCurrency  string            `json:"defaultCurrency" db:"default_currency"`
	DefaultTimeframe string            `json:"defaultTimeframe" db:"default_timeframe"`
	Theme            string            `json:"theme"`
	Notifications    map[string]bool   `json:"notifications"`
	ChartPreferences map[string]string `json:"chartPreferences" db:"chart_preferences"`
	Timestamps
}

type Session struct {
	ID               string     `json:"id"`
	UserID           string     `json:"userId" db:"user_id"`
	RefreshTokenHash string     `json:"-" db:"refresh_token_hash"`
	UserAgent        string     `json:"userAgent" db:"user_agent"`
	IP               string     `json:"ip"`
	ExpiresAt        time.Time  `json:"expiresAt" db:"expires_at"`
	RevokedAt        *time.Time `json:"revokedAt" db:"revoked_at"`
	CreatedAt        time.Time  `json:"createdAt" db:"created_at"`
}

// ---------------------------------------------------------------------------
// User content
// ---------------------------------------------------------------------------

type Watchlist struct {
	ID        string          `json:"id"`
	UserID    string          `json:"userId" db:"user_id"`
	Name      string          `json:"name"`
	IsDefault bool            `json:"isDefault" db:"is_default"`
	Items     []WatchlistItem `json:"items,omitempty"`
	Timestamps
}

type WatchlistItem struct {
	ID          string `json:"id"`
	WatchlistID string `json:"watchlistId" db:"watchlist_id"`
	Symbol      string `json:"symbol"`
	SortOrder   int    `json:"sortOrder" db:"sort_order"`
	Timestamps
}

type SavedChart struct {
	ID        string         `json:"id"`
	UserID    string         `json:"userId" db:"user_id"`
	Symbol    string         `json:"symbol"`
	Timeframe string         `json:"timeframe"`
	Config    map[string]any `json:"config"`
	Timestamps
}

type SavedAnalysis struct {
	ID        string `json:"id"`
	UserID    string `json:"userId" db:"user_id"`
	Title     string `json:"title"`
	Symbol    string `json:"symbol"`
	Timeframe string `json:"timeframe"`
	Notes     string `json:"notes"`
	Tag       string `json:"tag"`
	Timestamps
}

// Alert is an analysis-only notification trigger. It never places orders.
type Alert struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId" db:"user_id"`
	Symbol      string     `json:"symbol"`
	Condition   string     `json:"condition"` // price_above | price_below | rsi_above | rsi_below | ema_cross | sentiment_change
	Target      string     `json:"target"`    // human readable target, e.g. "$120,000" or "70"
	Status      string     `json:"status"`    // active | paused | triggered | expired
	LastTrigger *time.Time `json:"lastTrigger" db:"last_trigger"`
	Timestamps
}

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

type Asset struct {
	ID         string  `json:"id"`
	Symbol     string  `json:"symbol"`
	Name       string  `json:"name"`
	Pair       string  `json:"pair"`
	ImageURL   string  `json:"imageUrl" db:"image_url"`
	Sector     string  `json:"sector"`
	Color      string  `json:"color"`
	BasePrice  float64 `json:"basePrice" db:"base_price"`
	Volatility float64 `json:"volatility"`
	IsActive   bool    `json:"isActive" db:"is_active"`
	Timestamps
}

// MarketListing combines an asset with its latest snapshot for list views.
type MarketListing struct {
	ID        string    `json:"id"`
	Symbol    string    `json:"symbol"`
	Name      string    `json:"name"`
	Pair      string    `json:"pair"`
	ImageURL  string    `json:"imageUrl" db:"image_url"`
	Sector    string    `json:"sector"`
	Color     string    `json:"color"`
	Price     float64   `json:"price"`
	Change24h float64   `json:"change24h"`
	Change7d  float64   `json:"change7d"`
	High24h   float64   `json:"high24h"`
	Low24h    float64   `json:"low24h"`
	Volume24h float64   `json:"volume24h"`
	MarketCap float64   `json:"marketCap"`
	RSI       float64   `json:"rsi"`
	Timestamp time.Time `json:"timestamp"`
}

// MarketSnapshot is the current ticker state for one asset.
type MarketSnapshot struct {
	AssetID   string    `json:"assetId" db:"asset_id"`
	Symbol    string    `json:"symbol"`
	Price     float64   `json:"price"`
	Change24h float64   `json:"change24h"`
	Change7d  float64   `json:"change7d"`
	High24h   float64   `json:"high24h"`
	Low24h    float64   `json:"low24h"`
	Volume24h float64   `json:"volume24h"`
	MarketCap float64   `json:"marketCap"`
	RSI       float64   `json:"rsi"`
	Timestamp time.Time `json:"timestamp"`
}

type Candle struct {
	Timestamp time.Time `json:"timestamp"`
	Open      float64   `json:"open"`
	High      float64   `json:"high"`
	Low       float64   `json:"low"`
	Close     float64   `json:"close"`
	Volume    float64   `json:"volume"`
}

type TechnicalIndicator struct {
	AssetID    string    `json:"assetId" db:"asset_id"`
	Symbol     string    `json:"symbol"`
	Timeframe  string    `json:"timeframe"`
	RSI        float64   `json:"rsi"`
	MACD       float64   `json:"macd"`
	MACDSignal float64   `json:"macdSignal"`
	MACDHist   float64   `json:"macdHist"`
	EMA20      float64   `json:"ema20"`
	EMA50      float64   `json:"ema50"`
	EMA200     float64   `json:"ema200"`
	ATR        float64   `json:"atr"`
	Stochastic float64   `json:"stochastic"`
	OBV        float64   `json:"obv"`
	Support    float64   `json:"support"`
	Resistance float64   `json:"resistance"`
	Trend      string    `json:"trend"`
	Momentum   string    `json:"momentum"`
	Timestamp  time.Time `json:"timestamp"`
}

// MarketMetrics is a point-in-time snapshot of global market structure.
type MarketMetrics struct {
	ID                 int64     `json:"id"`
	TotalMarketCap     float64   `json:"totalMarketCap" db:"total_market_cap"`
	MarketCapChange    float64   `json:"marketCapChange" db:"market_cap_change"`
	TotalVolume        float64   `json:"totalVolume" db:"total_volume"`
	VolumeChange       float64   `json:"volumeChange" db:"volume_change"`
	BTCDominance       float64   `json:"btcDominance" db:"btc_dominance"`
	ETHDominance       float64   `json:"ethDominance" db:"eth_dominance"`
	OtherDominance     float64   `json:"otherDominance" db:"other_dominance"`
	OpenInterest       float64   `json:"openInterest" db:"open_interest"`
	OpenInterestChange float64   `json:"openInterestChange" db:"open_interest_change"`
	AltseasonIndex     float64   `json:"altseasonIndex" db:"altseason_index"`
	MarketIndex        float64   `json:"marketIndex" db:"market_index"`
	MarketIndexChange  float64   `json:"marketIndexChange" db:"market_index_change"`
	FearGreed          int       `json:"fearGreed" db:"fear_greed"`
	FearGreedLabel     string    `json:"fearGreedLabel" db:"fear_greed_label"`
	Timestamp          time.Time `json:"timestamp"`
}

type MarketSentiment struct {
	ID        int64          `json:"id"`
	Composite int            `json:"composite"`
	Label     string         `json:"label"`
	Drivers   map[string]any `json:"drivers"`
	Timestamp time.Time      `json:"timestamp"`
}

type FearGreedHistory struct {
	Date  time.Time `json:"date"`
	Value int       `json:"value"`
	Label string    `json:"label"`
}

type BitcoinDominance struct {
	Date  time.Time `json:"date"`
	BTC   float64   `json:"btc"`
	ETH   float64   `json:"eth"`
	Other float64   `json:"other"`
}

type MarketCapHistory struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

type VolumeHistory struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

type OpenInterestHistory struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

type NewsCategory struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type News struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Excerpt     string    `json:"excerpt"`
	Body        []string  `json:"body"`
	Source      string    `json:"source"`
	Category    string    `json:"category"`
	Sentiment   string    `json:"sentiment"` // bullish | bearish | neutral
	Assets      []string  `json:"assets"`
	ImageURL    string    `json:"imageUrl" db:"image_url"`
	ReadTime    string    `json:"readTime" db:"read_time"`
	PublishedAt time.Time `json:"publishedAt" db:"published_at"`
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

type AIAnalysis struct {
	ID        string         `json:"id"`
	UserID    string         `json:"userId" db:"user_id"`
	Symbol    string         `json:"symbol"`
	Timeframe string         `json:"timeframe"`
	Input     map[string]any `json:"input"`
	Output    map[string]any `json:"output"`
	Model     string         `json:"model"`
	Timestamps
}
