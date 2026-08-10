package marketdata

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"sync"
	"time"
)

// BinanceRESTBase is Binance's public market-data REST endpoint. It requires no
// API key and is not geo-blocked. Every request to it originates from the
// backend — clients never talk to providers directly.
const BinanceRESTBase = "https://data-api.binance.vision"

// FNGURL is the public Fear & Greed index feed. It is fetched server-side only.
const FNGURL = "https://api.alternative.me/fng/?limit=1"

// circulatingSupply holds rough circulating-supply estimates used to derive
// market caps from Binance prices (Binance does not expose supply).
var circulatingSupply = map[string]float64{
	"BTC": 19_800_000,
	"ETH": 120_400_000,
	"USDT": 172_000_000_000,
	"SOL": 474_000_000,
	"XRP": 57_000_000_000,
	"BNB": 145_000_000,
	"ADA": 35_000_000_000,
	"DOGE": 146_000_000_000,
	"AVAX": 405_000_000,
	"ARB": 4_800_000_000,
	"OP": 2_400_000_000,
	"UNI": 800_000_000,
	"AAVE": 15_000_000,
	"RENDER": 520_000_000,
	"FET": 2_400_000_000,
	"IMX": 1_700_000_000,
	"SAND": 2_400_000_000,
	"PEPE": 420_000_000_000_000,
}

type candleKey struct {
	symbol, tf string
}

type cachedCandles struct {
	at   time.Time
	data []Candle
}

type cachedIndicators struct {
	at   time.Time
	data IndicatorSet
}

// FNGReading is the current Fear & Greed index reading.
type FNGReading struct {
	Value int       `json:"value"`
	Label string    `json:"label"`
	At    time.Time `json:"at"`
}

// LiveProvider is a MarketDataProvider backed by Binance's public REST API.
//
// Snapshots, candles and indicators are cached in memory and refreshed by a
// background loop on the configured cadence (5–10s for crypto), so HTTP and
// WebSocket consumers always read from the cache. When Binance is unreachable
// the provider degrades gracefully to its embedded mock so the API stays up.
type LiveProvider struct {
	mock    *MockMarketDataProvider
	client  *http.Client
	baseURL string
	supply  map[string]float64

	// pair maps every catalog symbol to its Binance pair and back.
	pair         map[string]string
	symbolOf     map[string]string
	symbols      []string
	refreshEvery time.Duration
	fngRefresh   time.Duration

	mu          sync.RWMutex
	snapshots   map[string]Snapshot
	dailyClose  map[string]float64 // close 7 days ago, used for change7d
	dailyAt     time.Time
	indAt       time.Time // last time snapshot RSI was recomputed
	sparks      map[string][]float64 // 15m close series per symbol (bulk sparklines)
	sparksAt    time.Time
	candles     map[candleKey]cachedCandles
	indicators  map[candleKey]cachedIndicators
	metrics     GlobalMetrics
	fearGreed   FNGReading
	lastRefresh time.Time
	healthy     bool
}

// NewLiveProvider builds a live provider for the given asset catalog. When the
// network is unavailable it transparently falls back to the mock provider.
func NewLiveProvider(assets []AssetMeta, refresh time.Duration) *LiveProvider {
	if refresh < time.Second {
		refresh = 8 * time.Second
	}
	mock := NewMockProvider(assets)
	p := &LiveProvider{
		mock:       mock,
		client:     &http.Client{Timeout: 12 * time.Second},
		baseURL:    BinanceRESTBase,
		supply:     circulatingSupply,
		pair:       map[string]string{},
		symbolOf:   map[string]string{},
		snapshots:  map[string]Snapshot{},
		dailyClose: map[string]float64{},
		sparks:     map[string][]float64{},
		candles:    map[candleKey]cachedCandles{},
		indicators: map[candleKey]cachedIndicators{},
		metrics:      mock.GlobalMetrics(),
		refreshEvery: refresh,
		fngRefresh:   5 * time.Minute,
	}
	for _, a := range assets {
		bp := binancePair(a.Symbol)
		p.pair[a.Symbol] = bp
		p.symbolOf[bp] = a.Symbol
		p.symbols = append(p.symbols, a.Symbol)
	}
	sort.Strings(p.symbols)
	return p
}

// binancePair maps an app symbol to its Binance pair. USDT has no USDT/USDT
// pair, so we read the USDC pair (a ~1:1 stablecoin proxy).
func binancePair(symbol string) string {
	if symbol == "USDT" {
		return "USDCUSDT"
	}
	return symbol + "USDT"
}

// Run refreshes live data on the configured cadence until ctx is cancelled.
func (p *LiveProvider) Run(ctx context.Context) {
	// Fear & Greed first so the first refresh() doesn't zero it out.
	p.refreshFearGreed()
	p.refresh()

	ticker := time.NewTicker(p.refreshEvery)
	fng := time.NewTicker(p.fngRefresh)
	defer ticker.Stop()
	defer fng.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.refresh()
		case <-fng.C:
			p.refreshFearGreed()
		}
	}
}

// Status reports the provider health for /api/live/providers.
func (p *LiveProvider) Status() ProviderState {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return ProviderState{
		Active:      "binance",
		Healthy:     p.healthy,
		LastRefresh: p.lastRefresh,
	}
}

// FearGreed returns the latest Fear & Greed reading.
func (p *LiveProvider) FearGreed() FNGReading {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.fearGreed
}

// KnownSymbol reports whether the catalog contains the given symbol.
func (p *LiveProvider) KnownSymbol(symbol string) bool {
	_, ok := p.pair[symbol]
	return ok
}

// ---------------------------------------------------------------------------
// Snapshot refresh
// ---------------------------------------------------------------------------

func (p *LiveProvider) refresh() {
	snaps, err := p.fetchTickers()
	if err != nil {
		// Keep last-known prices; the fallback mock covers a cold start.
		return
	}
	now := time.Now()

	p.mu.Lock()
	for _, s := range snaps {
		p.snapshots[s.Symbol] = s
	}

	// Aggregate global metrics from live snapshots.
	var totalCap, totalVol, weightedChange float64
	for _, s := range p.snapshots {
		totalCap += s.MarketCap
		totalVol += s.Volume24h
		weightedChange += s.MarketCap * s.Change24h
	}
	g := p.metrics // preserve static/derived fields (OI, indexes, …)
	if totalCap > 0 {
		btc := p.snapshots["BTC"].MarketCap
		eth := p.snapshots["ETH"].MarketCap
		btcDom := btc / totalCap * 100
		ethDom := eth / totalCap * 100
		g.TotalMarketCap = totalCap
		g.MarketCapChange = round(weightedChange/totalCap, 2)
		g.TotalVolume = totalVol
		g.BTCDominance = round(btcDom, 1)
		g.ETHDominance = round(ethDom, 1)
		g.OtherDominance = round(100-btcDom-ethDom, 1)
		g.FearGreed = p.fearGreed.Value
		g.FearGreedLabel = p.fearGreed.Label
	}
	p.metrics = g
	p.lastRefresh = now
	p.healthy = true
	p.mu.Unlock()

	// Heavy refreshes run outside the write lock so HTTP/WS readers never
	// block on provider network calls (they are throttled internally).
	if time.Since(p.dailyAt) > time.Hour {
		p.refreshDaily()
	}
	if time.Since(p.indAt) > 5*time.Minute {
		p.refreshRSI()
	}
	if time.Since(p.sparksAt) > 2*time.Minute {
		p.refreshSparks()
	}
}

// fetchTickers pulls the 24hr ticker batch from Binance and builds snapshots.
func (p *LiveProvider) fetchTickers() ([]Snapshot, error) {
	pairs := make([]string, 0, len(p.symbols))
	for _, sym := range p.symbols {
		pairs = append(pairs, p.pair[sym])
	}
	payload, _ := json.Marshal(pairs)
	u := fmt.Sprintf("%s/api/v3/ticker/24hr?symbols=%s", p.baseURL, url.QueryEscape(string(payload)))

	res, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, fmt.Errorf("binance ticker status %d", res.StatusCode)
	}

	var rows []struct {
		Symbol             string `json:"symbol"`
		LastPrice          string `json:"lastPrice"`
		PriceChangePercent string `json:"priceChangePercent"`
		HighPrice          string `json:"highPrice"`
		LowPrice           string `json:"lowPrice"`
		QuoteVolume        string `json:"quoteVolume"`
	}
	if err := json.NewDecoder(res.Body).Decode(&rows); err != nil {
		return nil, err
	}

	p.mu.RLock()
	prev := p.snapshots
	daily := p.dailyClose
	p.mu.RUnlock()

	out := make([]Snapshot, 0, len(rows))
	for _, r := range rows {
		sym, ok := p.symbolOf[r.Symbol]
		if !ok {
			continue
		}
		price := parseFloat(r.LastPrice)
		if price <= 0 {
			continue
		}
		s := Snapshot{
			Symbol:    sym,
			Price:     price,
			Change24h: parseFloat(r.PriceChangePercent),
			High24h:   parseFloat(r.HighPrice),
			Low24h:    parseFloat(r.LowPrice),
			Volume24h: parseFloat(r.QuoteVolume),
			MarketCap: price * p.supply[sym],
			RSI:       50,
		}
		if d, ok := daily[sym]; ok && d > 0 {
			s.Change7d = pctChange(d, s.Price)
		}
		if old, ok := prev[sym]; ok {
			s.RSI = old.RSI
		}
		out = append(out, s)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("binance returned no matching tickers")
	}
	return out, nil
}

// refreshDaily caches the close from 7 days ago per symbol (hourly).
func (p *LiveProvider) refreshDaily() {
	closes := map[string]float64{}
	for _, sym := range p.symbols {
		candles, err := p.fetchKlinesRaw(p.pair[sym], "1d", 8)
		if err != nil || len(candles) < 2 {
			continue
		}
		closes[sym] = candles[0].Close
	}
	if len(closes) > 0 {
		p.mu.Lock()
		p.dailyClose = closes
		p.dailyAt = time.Now()
		p.mu.Unlock()
	}
}

// refreshRSI recomputes the RSI field on cached snapshots from 4h candles
// (throttled to every 5 minutes by the caller). Each mutation is guarded so
// concurrent HTTP readers are safe.
func (p *LiveProvider) refreshRSI() {
	at := time.Now()
	for _, sym := range p.symbols {
		candles, err := p.fetchKlinesRaw(p.pair[sym], "4h", 60)
		if err != nil || len(candles) < 30 {
			continue
		}
		closes := make([]float64, len(candles))
		highs := make([]float64, len(candles))
		lows := make([]float64, len(candles))
		volumes := make([]float64, len(candles))
		for i, c := range candles {
			closes[i], highs[i], lows[i], volumes[i] = c.Close, c.High, c.Low, c.Volume
		}
		ind := indicatorsFromCandles(closes, highs, lows, volumes)
		p.mu.Lock()
		p.indicators[candleKey{sym, "4h"}] = cachedIndicators{at: at, data: ind}
		if s, ok := p.snapshots[sym]; ok {
			s.RSI = ind.RSI
			p.snapshots[sym] = s
		}
		p.mu.Unlock()
	}
	p.mu.Lock()
	p.indAt = at
	p.mu.Unlock()
}

// refreshSparks caches the 15m close series per symbol (throttled to every 2
// minutes by the caller) so the bulk /api/live/sparks endpoint can seed every
// frontend sparkline with a single request instead of one klines call per
// symbol — the change that eliminated the per-symbol request burst.
func (p *LiveProvider) refreshSparks() {
	at := time.Now()
	sparks := map[string][]float64{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5) // limit outbound fan-out, like fetchYahoo
	for _, sym := range p.symbols {
		wg.Add(1)
		go func(symbol string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			candles, err := p.fetchKlinesRaw(p.pair[symbol], "15m", 32)
			if err != nil || len(candles) < 2 {
				return
			}
			closes := make([]float64, len(candles))
			for i, c := range candles {
				closes[i] = c.Close
			}
			mu.Lock()
			sparks[symbol] = closes
			mu.Unlock()
		}(sym)
	}
	wg.Wait()
	if len(sparks) > 0 {
		p.mu.Lock()
		p.sparks = sparks
		p.sparksAt = at
		p.mu.Unlock()
	}
}

// Sparks returns the cached 15m close series per symbol (deep copy).
func (p *LiveProvider) Sparks() map[string][]float64 {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make(map[string][]float64, len(p.sparks))
	for sym, series := range p.sparks {
		out[sym] = append([]float64(nil), series...)
	}
	return out
}

// ---------------------------------------------------------------------------
// MarketDataProvider interface
// ---------------------------------------------------------------------------

// Assets returns the catalog (same as the mock).
func (p *LiveProvider) Assets() []AssetMeta { return p.mock.Assets() }

// Snapshot returns the current live state of one market.
func (p *LiveProvider) Snapshot(symbol string) (Snapshot, error) {
	p.mu.RLock()
	s, ok := p.snapshots[symbol]
	p.mu.RUnlock()
	if ok {
		return s, nil
	}
	return p.mock.Snapshot(symbol)
}

// Snapshots returns the current live state of every market.
func (p *LiveProvider) Snapshots() ([]Snapshot, error) {
	p.mu.RLock()
	out := make([]Snapshot, 0, len(p.snapshots))
	for _, s := range p.snapshots {
		out = append(out, s)
	}
	p.mu.RUnlock()
	if len(out) == 0 {
		return p.mock.Snapshots()
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Symbol < out[j].Symbol })
	return out, nil
}

// Candles returns live OHLCV candles from Binance klines (cached ~1 min).
func (p *LiveProvider) Candles(symbol, timeframe string, limit int) ([]Candle, error) {
	if _, ok := SupportedTimeframes[timeframe]; !ok {
		return p.mock.Candles(symbol, timeframe, limit)
	}
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	key := candleKey{symbol, timeframe}

	p.mu.RLock()
	c, ok := p.candles[key]
	p.mu.RUnlock()
	if ok && time.Since(c.at) < time.Minute {
		return cloneCandles(c.data), nil
	}

	candles, err := p.fetchKlinesRaw(p.pair[symbol], timeframe, limit)
	if err != nil || len(candles) == 0 {
		return p.mock.Candles(symbol, timeframe, limit)
	}
	p.mu.Lock()
	p.candles[key] = cachedCandles{at: time.Now(), data: candles}
	p.mu.Unlock()
	return cloneCandles(candles), nil
}

// Indicators computes the indicator set from live candles (cached ~5 min).
func (p *LiveProvider) Indicators(symbol, timeframe string) (IndicatorSet, error) {
	key := candleKey{symbol, timeframe}

	p.mu.RLock()
	c, ok := p.indicators[key]
	p.mu.RUnlock()
	if ok && time.Since(c.at) < 5*time.Minute {
		return c.data, nil
	}

	candles, err := p.Candles(symbol, timeframe, 260)
	if err != nil || len(candles) < 30 {
		return p.mock.Indicators(symbol, timeframe)
	}
	closes := make([]float64, len(candles))
	highs := make([]float64, len(candles))
	lows := make([]float64, len(candles))
	volumes := make([]float64, len(candles))
	for i, c := range candles {
		closes[i], highs[i], lows[i], volumes[i] = c.Close, c.High, c.Low, c.Volume
	}
	ind := indicatorsFromCandles(closes, highs, lows, volumes)

	p.mu.Lock()
	p.indicators[key] = cachedIndicators{at: time.Now(), data: ind}
	p.mu.Unlock()
	return ind, nil
}

// GlobalMetrics returns the aggregated live global metrics.
func (p *LiveProvider) GlobalMetrics() GlobalMetrics {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.metrics
}

// Heatmap builds the 24h performance tiles from live snapshots.
func (p *LiveProvider) Heatmap() ([]HeatmapCell, error) {
	snaps, err := p.Snapshots()
	if err != nil {
		return nil, err
	}
	cells := make([]HeatmapCell, 0, len(snaps))
	for _, s := range snaps {
		meta, _ := p.mock.symbolIndex(s.Symbol)
		cells = append(cells, HeatmapCell{
			Symbol:    s.Symbol,
			Name:      meta.Name,
			Sector:    meta.Sector,
			Change24h: s.Change24h,
			MarketCap: s.MarketCap,
		})
	}
	return cells, nil
}

// The analytics/history feeds below have no live source in the requested
// provider set, so they delegate to the deterministic mock generator.
func (p *LiveProvider) Sentiment() (CompositeSentiment, error)     { return p.mock.Sentiment() }
func (p *LiveProvider) FearGreedHistory(days int) ([]FearGreedPoint, error) {
	return p.mock.FearGreedHistory(days)
}
func (p *LiveProvider) DominanceHistory(days int) ([]DominancePoint, error) {
	return p.mock.DominanceHistory(days)
}
func (p *LiveProvider) MarketCapHistory(days int) ([]HistoryPoint, error) {
	return p.mock.MarketCapHistory(days)
}
func (p *LiveProvider) VolumeHistory(days int) ([]HistoryPoint, error) {
	return p.mock.VolumeHistory(days)
}
func (p *LiveProvider) OpenInterestHistory(days int) ([]HistoryPoint, error) {
	return p.mock.OpenInterestHistory(days)
}

// ---------------------------------------------------------------------------
// Binance klines + Fear & Greed helpers
// ---------------------------------------------------------------------------

func (p *LiveProvider) fetchKlinesRaw(pair, tf string, limit int) ([]Candle, error) {
	u := fmt.Sprintf("%s/api/v3/klines?symbol=%s&interval=%s&limit=%d", p.baseURL, pair, tf, limit)
	res, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, fmt.Errorf("binance klines status %d", res.StatusCode)
	}
	var rows [][]any
	if err := json.NewDecoder(res.Body).Decode(&rows); err != nil {
		return nil, err
	}
	out := make([]Candle, 0, len(rows))
	for _, row := range rows {
		if len(row) < 6 {
			continue
		}
		openTime := int64(jsonNum(row[0]))
		out = append(out, Candle{
			Timestamp: openTime / 1000,
			Open:      jsonNum(row[1]),
			High:      jsonNum(row[2]),
			Low:       jsonNum(row[3]),
			Close:     jsonNum(row[4]),
			Volume:    jsonNum(row[5]),
		})
	}
	return out, nil
}

func (p *LiveProvider) refreshFearGreed() {
	res, err := p.client.Get(FNGURL)
	if err != nil {
		return
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return
	}
	var body struct {
		Data []struct {
			Value            string `json:"value"`
			ValueClass       string `json:"value_classification"`
			Timestamp        string `json:"timestamp"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil || len(body.Data) == 0 {
		return
	}
	v, _ := strconv.Atoi(body.Data[0].Value)
	reading := FNGReading{Value: v, Label: body.Data[0].ValueClass, At: time.Now()}

	p.mu.Lock()
	p.fearGreed = reading
	p.metrics.FearGreed = reading.Value
	p.metrics.FearGreedLabel = reading.Label
	p.mu.Unlock()
}

func cloneCandles(in []Candle) []Candle {
	out := make([]Candle, len(in))
	copy(out, in)
	return out
}

func parseFloat(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// jsonNum safely reads a JSON value that Binance encodes as either a number or
// a string (the klines endpoint mixes both).
func jsonNum(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case string:
		return parseFloat(n)
	default:
		return 0
	}
}
