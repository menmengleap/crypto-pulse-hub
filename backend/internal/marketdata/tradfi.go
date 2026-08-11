package marketdata

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"
)

// Traditional-markets feed (forex / indices / DXY / commodities / futures /
// bonds), served to the frontend over /api/live/tradfi* and the WebSocket hub.
//
// Providers (all server-side — User → Frontend → Backend → provider):
//
//	TWELVE DATA   realtime WebSocket + REST quotes for forex pairs and XAU/USD
//	Yahoo Finance indices (^GSPC …), Dollar Index (DX-Y.NYB), CME futures
//	             (ES=F …) and treasury yields (^TNX/^TYX) — the symbols the
//	             free TWELVE DATA plan 403/404s
//	Alpha Vantage treasury yield history, US inflation, commodity history
//	             (the "historical macro data")
//
// Quotes and sparks live in memory and are refreshed on a cadence; historical
// candles and macro series are cached (Redis when REDIS_URL is set, otherwise
// in-process) so the provider never hammers third-party rate limits.

// TradCategory identifies an instrument family.
type TradCategory string

const (
	CategoryForex     TradCategory = "forex"
	CategoryIndex     TradCategory = "index"
	CategoryDollar    TradCategory = "dollar"
	CategoryCommodity TradCategory = "commodity"
	CategoryFutures   TradCategory = "futures"
	CategoryBond      TradCategory = "bond"
)

// TradInstrument is one catalog entry in the trad-fi feed.
type TradInstrument struct {
	Symbol   string // display symbol, e.g. "EUR/USD", "SPX", "US10Y"
	Name     string
	Category TradCategory
	Currency string
	Digits   int     // decimals used by the UI to format the price
	Seed     float64 // fallback price used before the first live tick
	Provider string  // "twelvedata" | "yahoo" | "alphavantage"
	Twelve   bool    // subscribe on the TWELVE DATA WebSocket
	YahooSym string  // Yahoo ticker when Provider == "yahoo"
}

// tradfiCatalog is the full instrument list (matches the product spec).
var tradfiCatalog = []TradInstrument{
	// --- Forex (TWELVE DATA realtime WebSocket) ---
	{Symbol: "EUR/USD", Name: "Euro / US Dollar", Category: CategoryForex, Currency: "USD", Digits: 5, Seed: 1.15347, Provider: "twelvedata", Twelve: true},
	{Symbol: "GBP/USD", Name: "British Pound / US Dollar", Category: CategoryForex, Currency: "USD", Digits: 5, Seed: 1.2735, Provider: "twelvedata", Twelve: true},
	{Symbol: "USD/JPY", Name: "US Dollar / Japanese Yen", Category: CategoryForex, Currency: "JPY", Digits: 3, Seed: 155.28, Provider: "twelvedata", Twelve: true},
	{Symbol: "USD/CHF", Name: "US Dollar / Swiss Franc", Category: CategoryForex, Currency: "CHF", Digits: 5, Seed: 0.9024, Provider: "twelvedata", Twelve: true},
	{Symbol: "AUD/USD", Name: "Australian Dollar / US Dollar", Category: CategoryForex, Currency: "USD", Digits: 5, Seed: 0.6582, Provider: "twelvedata", Twelve: true},
	{Symbol: "USD/CAD", Name: "US Dollar / Canadian Dollar", Category: CategoryForex, Currency: "CAD", Digits: 5, Seed: 1.372, Provider: "twelvedata", Twelve: true},
	{Symbol: "NZD/USD", Name: "New Zealand Dollar / US Dollar", Category: CategoryForex, Currency: "USD", Digits: 5, Seed: 0.6114, Provider: "twelvedata", Twelve: true},
	{Symbol: "EUR/GBP", Name: "Euro / British Pound", Category: CategoryForex, Currency: "GBP", Digits: 5, Seed: 0.8512, Provider: "twelvedata", Twelve: true},
	{Symbol: "EUR/JPY", Name: "Euro / Japanese Yen", Category: CategoryForex, Currency: "JPY", Digits: 3, Seed: 163.42, Provider: "twelvedata", Twelve: true},
	{Symbol: "GBP/JPY", Name: "British Pound / Japanese Yen", Category: CategoryForex, Currency: "JPY", Digits: 3, Seed: 193.51, Provider: "twelvedata", Twelve: true},

	// --- Indices (Yahoo Finance) ---
	{Symbol: "SPX", Name: "S&P 500", Category: CategoryIndex, Currency: "USD", Digits: 2, Seed: 5438.66, Provider: "yahoo", YahooSym: "^GSPC"},
	{Symbol: "NDX", Name: "Nasdaq 100", Category: CategoryIndex, Currency: "USD", Digits: 2, Seed: 18924.52, Provider: "yahoo", YahooSym: "^IXIC"},
	{Symbol: "DJI", Name: "Dow Jones", Category: CategoryIndex, Currency: "USD", Digits: 2, Seed: 38912.3, Provider: "yahoo", YahooSym: "^DJI"},
	{Symbol: "RUT", Name: "Russell 2000", Category: CategoryIndex, Currency: "USD", Digits: 2, Seed: 2085.4, Provider: "yahoo", YahooSym: "^RUT"},
	{Symbol: "VIX", Name: "CBOE Volatility", Category: CategoryIndex, Currency: "USD", Digits: 2, Seed: 17.42, Provider: "yahoo", YahooSym: "^VIX"},

	// --- US Dollar Index (Yahoo Finance) ---
	{Symbol: "DXY", Name: "US Dollar Index", Category: CategoryDollar, Currency: "USD", Digits: 3, Seed: 103.42, Provider: "yahoo", YahooSym: "DX-Y.NYB"},

	// --- Commodities ---
	{Symbol: "XAU/USD", Name: "Gold (Spot)", Category: CategoryCommodity, Currency: "USD", Digits: 2, Seed: 4372.23, Provider: "twelvedata", Twelve: true},
	// XAGUSD=X was delisted from Yahoo — silver spot is served by the silver
	// futures contract (SI=F), which tracks spot within a few cents.
	{Symbol: "XAG/USD", Name: "Silver (Spot)", Category: CategoryCommodity, Currency: "USD", Digits: 3, Seed: 31.42, Provider: "yahoo", YahooSym: "SI=F"},
	{Symbol: "WTI", Name: "Crude Oil WTI", Category: CategoryCommodity, Currency: "USD", Digits: 2, Seed: 78.43, Provider: "yahoo", YahooSym: "CL=F"},
	{Symbol: "BRENT", Name: "Brent Crude", Category: CategoryCommodity, Currency: "USD", Digits: 2, Seed: 82.15, Provider: "yahoo", YahooSym: "BZ=F"},
	{Symbol: "NATURAL GAS", Name: "Natural Gas", Category: CategoryCommodity, Currency: "USD", Digits: 3, Seed: 2.612, Provider: "yahoo", YahooSym: "NG=F"},

	// --- CME futures (Yahoo Finance) ---
	{Symbol: "ES", Name: "S&P 500 E-mini", Category: CategoryFutures, Currency: "USD", Digits: 2, Seed: 5436.75, Provider: "yahoo", YahooSym: "ES=F"},
	{Symbol: "NQ", Name: "Nasdaq 100 E-mini", Category: CategoryFutures, Currency: "USD", Digits: 2, Seed: 18940.0, Provider: "yahoo", YahooSym: "NQ=F"},
	{Symbol: "YM", Name: "Dow E-mini", Category: CategoryFutures, Currency: "USD", Digits: 2, Seed: 38900.0, Provider: "yahoo", YahooSym: "YM=F"},
	{Symbol: "RTY", Name: "Russell 2000 E-mini", Category: CategoryFutures, Currency: "USD", Digits: 2, Seed: 2088.0, Provider: "yahoo", YahooSym: "RTY=F"},
	{Symbol: "GC", Name: "Gold Futures", Category: CategoryFutures, Currency: "USD", Digits: 2, Seed: 4390.2, Provider: "yahoo", YahooSym: "GC=F"},
	{Symbol: "SI", Name: "Silver Futures", Category: CategoryFutures, Currency: "USD", Digits: 3, Seed: 31.5, Provider: "yahoo", YahooSym: "SI=F"},
	{Symbol: "CL", Name: "Crude Oil Futures", Category: CategoryFutures, Currency: "USD", Digits: 2, Seed: 78.4, Provider: "yahoo", YahooSym: "CL=F"},
	{Symbol: "NG", Name: "Natural Gas Futures", Category: CategoryFutures, Currency: "USD", Digits: 3, Seed: 2.61, Provider: "yahoo", YahooSym: "NG=F"},

	// --- US treasury yields ---
	{Symbol: "US10Y", Name: "US 10Y Treasury", Category: CategoryBond, Currency: "%", Digits: 3, Seed: 4.31, Provider: "yahoo", YahooSym: "^TNX"},
	{Symbol: "US30Y", Name: "US 30Y Treasury", Category: CategoryBond, Currency: "%", Digits: 3, Seed: 4.68, Provider: "yahoo", YahooSym: "^TYX"},
	// US02Y has no realtime Yahoo feed — it is anchored to Alpha Vantage's
	// monthly treasury series (updated on the macro cadence).
	{Symbol: "US02Y", Name: "US 2Y Treasury", Category: CategoryBond, Currency: "%", Digits: 3, Seed: 4.14, Provider: "alphavantage"},
}

// TradQuote is the live state of one traditional-market instrument.
type TradQuote struct {
	Symbol    string    `json:"symbol"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	Price     float64   `json:"price"`
	PrevClose float64   `json:"prevClose"`
	Change    float64   `json:"change"`
	ChangePct float64   `json:"changePct"`
	High      float64   `json:"high"`
	Low       float64   `json:"low"`
	Spark     []float64 `json:"spark"`
	Source    string    `json:"source"`
	Currency  string    `json:"currency"`
	Digits    int       `json:"digits"`
	Live      bool      `json:"live"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// MacroPoint is one dated macro reading (yield %, inflation %, price).
type MacroPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

// MacroSnapshot holds the Alpha Vantage macro block served over REST.
type MacroSnapshot struct {
	Treasury    map[string][]MacroPoint `json:"treasury"`
	Inflation   []MacroPoint            `json:"inflation"`
	Commodities map[string][]MacroPoint `json:"commodities"`
	UpdatedAt   time.Time               `json:"updatedAt"`
}

// TradFiOptions configures NewTradFiProvider.
type TradFiOptions struct {
	TwelveDataAPIKey string
	AlphaVantageKey  string
	WSEnabled        bool
	RefreshEvery     time.Duration
	Cache            Cache
}

// TradFiProvider is the traditional-markets coordinator.
type TradFiProvider struct {
	client       *http.Client
	cache        Cache
	twelveKey    string
	avKey        string
	wsEnabled    bool
	refreshEvery time.Duration
	catalog      []TradInstrument

	mu           sync.RWMutex
	quotes       map[string]*TradQuote
	symbolIndex  map[string]TradInstrument
	lastWS       time.Time
	lastYahoo    time.Time
	lastTD       time.Time
	tdCursor     int // round-robin position for the 8-credit REST rotation
	tdBudget     *twelveBudget
	macro        MacroSnapshot
	avAt         time.Time
	avRefreshing int32
	states       map[string]ProviderState
}

// NewTradFiProvider builds the provider with seeded fallback prices.
func NewTradFiProvider(opts TradFiOptions) *TradFiProvider {
	if opts.RefreshEvery < time.Second {
		opts.RefreshEvery = 15 * time.Second
	}
	if opts.Cache == nil {
		opts.Cache = NewMemoryCache()
	}
	p := &TradFiProvider{
		client:       &http.Client{Timeout: 12 * time.Second},
		cache:        opts.Cache,
		twelveKey:    opts.TwelveDataAPIKey,
		avKey:        opts.AlphaVantageKey,
		wsEnabled:    opts.WSEnabled,
		refreshEvery: opts.RefreshEvery,
		catalog:      tradfiCatalog,
		quotes:       map[string]*TradQuote{},
		symbolIndex:  map[string]TradInstrument{},
		states: map[string]ProviderState{
			"twelvedata":  {Active: "static", Healthy: false},
			"yahoo":       {Active: "static", Healthy: false},
			"alphavantage": {Active: "static", Healthy: false},
		},
	}
	for _, inst := range tradfiCatalog {
		p.symbolIndex[inst.Symbol] = inst
		p.quotes[inst.Symbol] = p.seedQuote(inst)
	}
	p.tdBudget = &twelveBudget{}
	return p
}

// seedQuote builds the initial quote with a deterministic fallback spark so
// SSR markup and a cold backend are stable before the first live tick.
func (p *TradFiProvider) seedQuote(inst TradInstrument) *TradQuote {
	q := &TradQuote{
		Symbol:    inst.Symbol,
		Name:      inst.Name,
		Category:  string(inst.Category),
		Price:     inst.Seed,
		PrevClose: inst.Seed,
		Currency:  inst.Currency,
		Digits:    inst.Digits,
		Source:    "static",
		UpdatedAt: time.Now(),
	}
	// Deterministic walk (stable across restarts).
	x := uint32(len(inst.Symbol)*2654435761%100003 + 17)
	rand := func() float64 {
		x = x*1664525 + 1013904223
		return float64(x%1000) / 1000
	}
	v := inst.Seed * (0.995 + rand()*0.01)
	for i := 0; i < 48; i++ {
		q.Spark = append(q.Spark, round4(v))
		v *= 1 + (rand()-0.48)*0.003
	}
	q.Spark = append(q.Spark, inst.Seed)
	return q
}

// Run refreshes all trad-fi data until ctx is cancelled.
func (p *TradFiProvider) Run(ctx context.Context) {
	if p.wsEnabled && p.twelveKey != "" {
		go p.runTwelveWS(ctx)
	}
	p.refreshTwelveQuotes()
	p.refreshYahooQuotes()
	go p.refreshTDSparks(ctx) // paced — takes ~90s on a cold cache
	p.refreshAVMacro()

	ticker := time.NewTicker(p.refreshEvery)
	sparkTicker := time.NewTicker(5 * time.Minute)
	avTicker := time.NewTicker(12 * time.Hour)
	defer ticker.Stop()
	defer sparkTicker.Stop()
	defer avTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.refreshTwelveQuotes()
			p.refreshYahooQuotes()
		case <-sparkTicker.C:
			// Runs in a goroutine: a cold-cache pass is paced at ~8s per symbol
			// (~90s total) and must never stall the quote-refresh loop.
			go p.refreshTDSparks(ctx)
		case <-avTicker.C:
			p.refreshAVMacro()
		}
	}
}

// Status reports per-source health for /api/live/providers.
func (p *TradFiProvider) Status() map[string]ProviderState {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := map[string]ProviderState{}
	for k, v := range p.states {
		out[k] = v
	}
	return out
}

// KnownSymbol reports whether the catalog contains the symbol.
func (p *TradFiProvider) KnownSymbol(symbol string) bool {
	_, ok := p.symbolIndex[symbol]
	return ok
}

// Quotes returns a deep copy of every quote in catalog order.
func (p *TradFiProvider) Quotes() []TradQuote {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make([]TradQuote, 0, len(p.catalog))
	for _, inst := range p.catalog {
		if q, ok := p.quotes[inst.Symbol]; ok {
			qq := *q
			qq.Spark = append([]float64(nil), q.Spark...)
			out = append(out, qq)
		}
	}
	return out
}

// Quote returns the latest state of one instrument.
func (p *TradFiProvider) Quote(symbol string) (TradQuote, bool) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	q, ok := p.quotes[symbol]
	if !ok {
		return TradQuote{}, false
	}
	qq := *q
	qq.Spark = append([]float64(nil), q.Spark...)
	return qq, true
}

// Macro returns a deep copy of the Alpha Vantage macro block, refreshing it in
// the background when it has gone stale (12h — Alpha Vantage free is 25/day).
func (p *TradFiProvider) Macro() MacroSnapshot {
	p.ensureAVFresh()
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := MacroSnapshot{
		Treasury:    map[string][]MacroPoint{},
		Commodities: map[string][]MacroPoint{},
		UpdatedAt:   p.macro.UpdatedAt,
	}
	for k, v := range p.macro.Treasury {
		out.Treasury[k] = append([]MacroPoint(nil), v...)
	}
	for k, v := range p.macro.Commodities {
		out.Commodities[k] = append([]MacroPoint(nil), v...)
	}
	out.Inflation = append([]MacroPoint(nil), p.macro.Inflation...)
	return out
}

// Historical returns OHLCV candles for one instrument (REST, cached 5 min).
// TWELVE DATA serves forex/metals; Yahoo serves indices/DXY/futures/bonds.
func (p *TradFiProvider) Historical(ctx context.Context, symbol, timeframe string, limit int) ([]Candle, error) {
	inst, ok := p.symbolIndex[symbol]
	if !ok {
		return nil, fmt.Errorf("unknown trad-fi symbol %q", symbol)
	}
	if inst.Provider == "twelvedata" {
		return p.twelveHistorical(ctx, inst, timeframe, limit)
	}
	return p.yahooHistorical(ctx, inst, timeframe, limit)
}

// ensureAVFresh kicks off a background macro refresh when stale (single-flight).
func (p *TradFiProvider) ensureAVFresh() {
	p.mu.RLock()
	stale := time.Since(p.avAt) > 12*time.Hour
	p.mu.RUnlock()
	if !stale || p.avRefreshing != 0 {
		return
	}
	if swapIfZero(&p.avRefreshing) {
		go func() {
			defer storeZero(&p.avRefreshing)
			p.refreshAVMacro()
		}()
	}
}

// ---------------------------------------------------------------------------
// Quote mutation helpers (callers hold no lock)
// ---------------------------------------------------------------------------

// updateQuote merges a partial update into the cached quote. Only positive
// finite values are applied; live price ticks are appended to the spark.
func (p *TradFiProvider) updateQuote(u TradQuote) {
	p.mu.Lock()
	defer p.mu.Unlock()
	cur, ok := p.quotes[u.Symbol]
	if !ok {
		return
	}
	if u.Price > 0 && isFinite(u.Price) {
		cur.Price = u.Price
		cur.Live = true
	}
	if u.High > 0 && isFinite(u.High) {
		cur.High = u.High
	}
	if u.Low > 0 && isFinite(u.Low) {
		cur.Low = u.Low
	}
	if u.PrevClose > 0 && isFinite(u.PrevClose) {
		cur.PrevClose = u.PrevClose
		cur.Change = cur.Price - u.PrevClose
		cur.ChangePct = pctChange(u.PrevClose, cur.Price)
	} else if cur.PrevClose > 0 {
		cur.Change = cur.Price - cur.PrevClose
		cur.ChangePct = pctChange(cur.PrevClose, cur.Price)
	}
	if u.Source != "" {
		cur.Source = u.Source
	}
	cur.UpdatedAt = time.Now()
	// Append the tick to the spark (dedupe repeated WS ticks).
	if cur.Price > 0 {
		if n := len(cur.Spark); n == 0 || cur.Spark[n-1] != cur.Price {
			cur.Spark = appendSeries(cur.Spark, []float64{cur.Price}, 64)
		}
	}
}

// setSpark replaces a quote's intraday series wholesale (e.g. a fresh 5m
// candle fetch). Takes no lock.
func (p *TradFiProvider) setSpark(symbol string, series []float64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if q, ok := p.quotes[symbol]; ok && len(series) >= 2 {
		// Cap at 64 — the UI only renders the tail (~40–56 points) and the
		// REST snapshot should stay lean.
		if len(series) > 64 {
			series = series[len(series)-64:]
		}
		q.Spark = append([]float64(nil), series...)
	}
}

// markWS records the last WebSocket tick and provider health.
func (p *TradFiProvider) markWS(now time.Time) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.lastWS = now
	p.states["twelvedata"] = ProviderState{Active: "twelvedata", Healthy: true, LastRefresh: now}
}

// twelveSymbols lists the catalog symbols subscribed on the TWELVE DATA WS.
func (p *TradFiProvider) twelveSymbols() []string {
	out := []string{}
	for _, inst := range p.catalog {
		if inst.Twelve {
			out = append(out, inst.Symbol)
		}
	}
	sort.Strings(out)
	return out
}

func (p *TradFiProvider) isTwelveSymbol(sym string) bool {
	inst, ok := p.symbolIndex[sym]
	return ok && inst.Twelve
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}

// isFinite reports whether v is a usable (non-NaN, non-Inf) number.
func isFinite(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0)
}
