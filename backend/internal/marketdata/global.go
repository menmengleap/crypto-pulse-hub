package marketdata

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// GlobalProvider serves stocks & forex tickers to the frontend, always
// server-side. Each asset class has two interchangeable providers:
//
//	forex  → exchangerate-api  ⇄  Frankfurter (ECB)
//	stocks → Yahoo Finance    ⇄  Finnhub
//
// Failover is automatic: when the active provider fails on consecutive
// refresh cycles the provider flips to the other one; a successful refresh
// resets the failure counter. Clients never learn about (or talk to) the
// underlying providers — they only read the backend's cached snapshot.

const (
	yahooBase         = "https://query1.finance.yahoo.com/v8/finance/chart"
	finnhubBase       = "https://finnhub.io/api/v1/quote"
	exchangeRateBase  = "https://v6.exchangerate-api.com/v6"
	frankfurterBase   = "https://api.frankfurter.app/latest"
	forexSparkLimit   = 28
	stockSparkLimit   = 28
	maxProviderErrors = 2 // consecutive failures before switching
)

// StockTicker is one equity ticker served to clients.
type StockTicker struct {
	ID        string    `json:"id"`
	Symbol    string    `json:"symbol"`
	Name      string    `json:"name"`
	Price     float64   `json:"price"`
	PrevClose float64   `json:"prevClose"`
	Change    float64   `json:"change"`
	Volume    float64   `json:"volume"`
	MarketCap float64   `json:"marketCap"`
	Spark     []float64 `json:"spark"`
	Source    string    `json:"source"`
}

// ForexTicker is one FX / metal ticker served to clients.
type ForexTicker struct {
	ID        string    `json:"id"`
	Symbol    string    `json:"symbol"`
	Name      string    `json:"name"`
	Price     float64   `json:"price"`
	PrevClose float64   `json:"prevClose"`
	Change    float64   `json:"change"`
	Volume    float64   `json:"volume"`
	Spark     []float64 `json:"spark"`
	Source    string    `json:"source"`

	// code/mode/live are unexported derivation hints (not serialized). `live`
	// becomes true after the first successful provider refresh, so change is
	// only shown against a previous *live* price (not the static seed).
	code string
	mode forexMode
	live bool
}

// StockSymbols returns the supported equity symbols (used by the Finnhub
// fundamentals endpoint to validate requests).
func StockSymbols() []string {
	out := make([]string, len(stockCatalog))
	for i, s := range stockCatalog {
		out[i] = s.symbol
	}
	return out
}

// ProviderState describes which provider is active and whether it is healthy.
type ProviderState struct {
	Active      string    `json:"active"`
	Healthy     bool      `json:"healthy"`
	LastRefresh time.Time `json:"lastRefresh"`
	Errors      int       `json:"errors"`
}

// GlobalSnapshot is a point-in-time copy of every global ticker plus provider
// health, so handlers never expose a live view to callers.
type GlobalSnapshot struct {
	Stocks    []StockTicker            `json:"stocks"`
	Forex     []ForexTicker            `json:"forex"`
	Providers map[string]ProviderState `json:"providers"`
}

type stockSeed struct {
	id, symbol, name         string
	price, volume, marketCap float64
}

var stockCatalog = []stockSeed{
	{id: "aapl", symbol: "AAPL", name: "Apple", price: 212.4, volume: 52_400_000_000, marketCap: 3_240_000_000_000},
	{id: "nvda", symbol: "NVDA", name: "NVIDIA", price: 173.2, volume: 38_900_000_000, marketCap: 4_270_000_000_000},
	{id: "msft", symbol: "MSFT", name: "Microsoft", price: 468.1, volume: 21_300_000_000, marketCap: 3_480_000_000_000},
	{id: "tsla", symbol: "TSLA", name: "Tesla", price: 296.55, volume: 33_700_000_000, marketCap: 946_000_000_000},
	{id: "amzn", symbol: "AMZN", name: "Amazon", price: 221.3, volume: 15_600_000_000, marketCap: 2_320_000_000_000},
	{id: "googl", symbol: "GOOGL", name: "Alphabet", price: 182.75, volume: 19_800_000_000, marketCap: 2_250_000_000_000},
	{id: "meta", symbol: "META", name: "Meta Platforms", price: 612.8, volume: 14_200_000_000, marketCap: 1_550_000_000_000},
	{id: "amd", symbol: "AMD", name: "Advanced Micro Devices", price: 168.4, volume: 27_500_000_000, marketCap: 273_000_000_000},
	{id: "nflx", symbol: "NFLX", name: "Netflix", price: 1012.3, volume: 9_100_000_000, marketCap: 432_000_000_000},
	{id: "jpm", symbol: "JPM", name: "JPMorgan Chase", price: 268.1, volume: 7_800_000_000, marketCap: 755_000_000_000},
}

// forexMode tells the provider how to derive a pair from USD-based rates. Both
// APIs return "1 USD = X other" (e.g. rates["EUR"] ≈ 0.87), so pairs quoted in
// USD (EUR/USD) are inverted while pairs quoted in foreign currency (USD/JPY)
// use the rate directly.
type forexMode int

const (
	forexDirect  forexMode = iota // rate[code] IS the pair price (USD/JPY, USD/CHF, …)
	forexInverse                  // 1 / rate[code] (EUR/USD, GBP/USD, …)
	forexCross                    // rates["GBP"] / rates["EUR"] → EUR/GBP
	forexStatic                   // no live source (e.g. XAU/USD) — hold last price
)

type forexSeed struct {
	id, symbol, name string
	code             string
	mode             forexMode
	price, volume    float64
}

var forexCatalog = []forexSeed{
	{id: "eurusd", symbol: "EUR/USD", name: "Euro / US Dollar", code: "EUR", mode: forexInverse, price: 1.0842, volume: 128_000_000_000},
	{id: "gbpusd", symbol: "GBP/USD", name: "British Pound / US Dollar", code: "GBP", mode: forexInverse, price: 1.2735, volume: 86_000_000_000},
	{id: "usdjpy", symbol: "USD/JPY", name: "US Dollar / Japanese Yen", code: "JPY", mode: forexDirect, price: 155.28, volume: 112_000_000_000},
	{id: "usdchf", symbol: "USD/CHF", name: "US Dollar / Swiss Franc", code: "CHF", mode: forexDirect, price: 0.9024, volume: 41_000_000_000},
	{id: "audusd", symbol: "AUD/USD", name: "Australian Dollar / US Dollar", code: "AUD", mode: forexInverse, price: 0.6582, volume: 54_000_000_000},
	{id: "usdcad", symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", code: "CAD", mode: forexDirect, price: 1.372, volume: 47_000_000_000},
	{id: "nzdusd", symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", code: "NZD", mode: forexInverse, price: 0.6114, volume: 18_000_000_000},
	{id: "eurgbp", symbol: "EUR/GBP", name: "Euro / British Pound", code: "EURGBP", mode: forexCross, price: 0.8512, volume: 26_000_000_000},
	{id: "usdsgd", symbol: "USD/SGD", name: "US Dollar / Singapore Dollar", code: "SGD", mode: forexDirect, price: 1.3412, volume: 22_000_000_000},
	{id: "xauusd", symbol: "XAU/USD", name: "Gold (Spot)", code: "XAU", mode: forexStatic, price: 2420.1, volume: 65_000_000_000},
}

type stockQuote struct {
	price, prevClose, volume, marketCap float64
	spark                               []float64
	ok                                  bool
}

// GlobalProvider holds the cached global tickers and provider-failover state.
type GlobalProvider struct {
	client          *http.Client
	finnhubKey      string
	exchangeRateKey string

	mu          sync.RWMutex
	stocks      []StockTicker
	forex       []ForexTicker
	stockActive string
	forexActive string
	stockErrors int
	forexErrors int
	stockState  ProviderState
	forexState  ProviderState

	stockRefresh time.Duration
	forexRefresh time.Duration
}

// NewGlobalProvider builds the provider. stockRefresh (30–60s) and forexRefresh
// (15–30s) control how often each asset class is refreshed.
func NewGlobalProvider(finnhubKey, exchangeRateKey string, stockRefresh, forexRefresh time.Duration) *GlobalProvider {
	if stockRefresh < time.Second {
		stockRefresh = 45 * time.Second
	}
	if forexRefresh < time.Second {
		forexRefresh = 20 * time.Second
	}
	p := &GlobalProvider{
		client:          &http.Client{Timeout: 10 * time.Second},
		finnhubKey:      finnhubKey,
		exchangeRateKey: exchangeRateKey,
		stockActive:     "yahoo",
		forexActive:     "exchangerate-api",
		stockRefresh:    stockRefresh,
		forexRefresh:    forexRefresh,
	}
	for _, s := range stockCatalog {
		p.stocks = append(p.stocks, StockTicker{
			ID: s.id, Symbol: s.symbol, Name: s.name,
			Price: s.price, PrevClose: s.price, Volume: s.volume, MarketCap: s.marketCap,
		})
	}
	for _, f := range forexCatalog {
		p.forex = append(p.forex, ForexTicker{
			ID: f.id, Symbol: f.symbol, Name: f.name,
			Price: f.price, PrevClose: f.price, Volume: f.volume,
			code: f.code, mode: f.mode,
		})
	}
	return p
}

// Run refreshes stocks and forex on their own cadences until ctx is cancelled.
func (p *GlobalProvider) Run(ctx context.Context) {
	stockTicker := time.NewTicker(p.stockRefresh)
	forexTicker := time.NewTicker(p.forexRefresh)
	defer stockTicker.Stop()
	defer forexTicker.Stop()

	// Prime the cache immediately so /api/live/* has data on first request.
	done := make(chan struct{})
	go func() { p.refreshStocks(); close(done) }()
	select {
	case <-done:
	case <-ctx.Done():
		return
	}
	p.refreshForex()

	for {
		select {
		case <-ctx.Done():
			return
		case <-stockTicker.C:
			p.refreshStocks()
		case <-forexTicker.C:
			p.refreshForex()
		}
	}
}

// Snapshot returns a deep copy of the current tickers + provider states. The
// spark slices are cloned so the refresh goroutine can never append into an
// array that a handler is concurrently marshaling to JSON.
func (p *GlobalProvider) Snapshot() GlobalSnapshot {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := GlobalSnapshot{
		Stocks:    make([]StockTicker, len(p.stocks)),
		Forex:     make([]ForexTicker, len(p.forex)),
		Providers: map[string]ProviderState{"stocks": p.stockState, "forex": p.forexState},
	}
	for i, s := range p.stocks {
		out.Stocks[i] = s
		out.Stocks[i].Spark = append([]float64(nil), s.Spark...)
	}
	for i, f := range p.forex {
		out.Forex[i] = f
		out.Forex[i].Spark = append([]float64(nil), f.Spark...)
	}
	return out
}

// ---------------------------------------------------------------------------
// Stocks — Yahoo Finance (primary) ⇄ Finnhub (fallback)
// ---------------------------------------------------------------------------

func (p *GlobalProvider) refreshStocks() {
	active := p.stockActive
	var quotes map[string]stockQuote
	var source string
	var err error

	if active == "finnhub" {
		quotes, source, err = p.fetchFinnhub()
	} else {
		quotes, source, err = p.fetchYahoo()
	}

	if err != nil {
		p.mu.Lock()
		p.stockErrors++
		p.stockState.Healthy = false
		p.stockState.Active = p.stockActive
		p.stockState.Errors = p.stockErrors
		if p.stockErrors >= maxProviderErrors {
			p.stockActive = flipProvider(p.stockActive)
			p.stockErrors = 0
		}
		p.mu.Unlock()
		return
	}

	p.mu.Lock()
	p.stockErrors = 0
	p.stockActive = source
	p.stockState = ProviderState{Active: source, Healthy: true, LastRefresh: time.Now(), Errors: 0}
	for i := range p.stocks {
		t := &p.stocks[i]
		q, ok := quotes[t.Symbol]
		if !ok || !q.ok || q.price <= 0 {
			continue
		}
		prev := t.Price
		if q.prevClose > 0 {
			t.PrevClose = q.prevClose
		} else if prev > 0 {
			t.PrevClose = prev
		}
		t.Price = q.price
		if t.PrevClose > 0 {
			t.Change = pctChange(t.PrevClose, t.Price)
		}
		if len(q.spark) >= 2 {
			t.Spark = appendSeries(t.Spark, q.spark, stockSparkLimit)
		} else {
			t.Spark = appendSeries(t.Spark, []float64{t.Price}, stockSparkLimit)
		}
		if q.volume > 0 {
			t.Volume = q.volume
		}
		if q.marketCap > 0 {
			t.MarketCap = q.marketCap
		}
		t.Source = source
	}
	p.mu.Unlock()
}

// Yahoo requires a browser-like User-Agent; without one it returns 429.
const yahooUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

// fetchYahoo pulls price/prevClose/volume + a 5-day close series per symbol.
func (p *GlobalProvider) fetchYahoo() (map[string]stockQuote, string, error) {
	quotes := map[string]stockQuote{}
	var mu sync.Mutex
	var failures int
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5)

	for _, s := range stockCatalog {
		wg.Add(1)
		go func(seed stockSeed) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			q := stockQuote{marketCap: seed.marketCap}
			// range=1mo gives ~22 daily closes so the sparkline has real shape.
			u := fmt.Sprintf("%s/%s?interval=1d&range=1mo", yahooBase, seed.symbol)
			req, err := http.NewRequest(http.MethodGet, u, nil)
			if err != nil {
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}
			req.Header.Set("User-Agent", yahooUserAgent)
			res, err := p.client.Do(req)
			if err != nil {
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}
			defer func() { _ = res.Body.Close() }()
			if res.StatusCode != http.StatusOK {
				_, _ = io.Copy(io.Discard, res.Body)
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}

			var body struct {
				Chart struct {
					Result []struct {
						Meta struct {
							RegularMarketPrice  *float64 `json:"regularMarketPrice"`
							ChartPreviousClose  *float64 `json:"chartPreviousClose"`
							PreviousClose       *float64 `json:"previousClose"`
							RegularMarketVolume *float64 `json:"regularMarketVolume"`
						} `json:"meta"`
						Timestamp  []int64 `json:"timestamp"`
						Indicators struct {
							Quote []struct {
								Close []*float64 `json:"close"`
							} `json:"quote"`
						} `json:"indicators"`
					} `json:"result"`
				} `json:"chart"`
			}
			if err := json.NewDecoder(res.Body).Decode(&body); err != nil || len(body.Chart.Result) == 0 {
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}
			r := body.Chart.Result[0]
			closes := []float64{}
			if len(r.Indicators.Quote) > 0 {
				for _, c := range r.Indicators.Quote[0].Close {
					if c != nil && *c > 0 {
						closes = append(closes, *c)
					}
				}
			}

			price := 0.0
			if r.Meta.RegularMarketPrice != nil {
				price = *r.Meta.RegularMarketPrice
			} else if len(closes) > 0 {
				price = closes[len(closes)-1]
			}
			if price <= 0 {
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}

			q.ok = true
			q.price = price
			if r.Meta.ChartPreviousClose != nil {
				q.prevClose = *r.Meta.ChartPreviousClose
			} else if r.Meta.PreviousClose != nil {
				q.prevClose = *r.Meta.PreviousClose
			}
			if r.Meta.RegularMarketVolume != nil {
				q.volume = *r.Meta.RegularMarketVolume
			}
			q.spark = closes

			mu.Lock()
			quotes[seed.symbol] = q
			mu.Unlock()
		}(s)
	}
	wg.Wait()

	if len(quotes) == 0 || failures == len(stockCatalog) {
		return nil, "yahoo", fmt.Errorf("yahoo finance unavailable")
	}
	return quotes, "yahoo", nil
}

// fetchFinnhub pulls current + previous close per symbol from Finnhub.
func (p *GlobalProvider) fetchFinnhub() (map[string]stockQuote, string, error) {
	quotes := map[string]stockQuote{}
	var mu sync.Mutex
	var failures int
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5)

	for _, s := range stockCatalog {
		wg.Add(1)
		go func(seed stockSeed) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			q := stockQuote{marketCap: seed.marketCap, volume: seed.volume}
			u := fmt.Sprintf("%s?symbol=%s&token=%s", finnhubBase, seed.symbol, p.finnhubKey)
			res, err := p.client.Get(u)
			if err != nil {
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}
			defer func() { _ = res.Body.Close() }()
			if res.StatusCode != http.StatusOK {
				_, _ = io.Copy(io.Discard, res.Body)
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}
			var body struct {
				C  float64 `json:"c"`
				PC float64 `json:"pc"`
			}
			if err := json.NewDecoder(res.Body).Decode(&body); err != nil || body.C <= 0 {
				mu.Lock()
				failures++
				mu.Unlock()
				return
			}
			q.ok = true
			q.price = body.C
			q.prevClose = body.PC

			mu.Lock()
			quotes[seed.symbol] = q
			mu.Unlock()
		}(s)
	}
	wg.Wait()

	if len(quotes) == 0 || failures == len(stockCatalog) {
		return nil, "finnhub", fmt.Errorf("finnhub unavailable")
	}
	return quotes, "finnhub", nil
}

// ---------------------------------------------------------------------------
// Forex — exchangerate-api (primary) ⇄ Frankfurter (fallback)
// ---------------------------------------------------------------------------

func (p *GlobalProvider) refreshForex() {
	active := p.forexActive
	var rates map[string]float64
	var source string
	var err error

	if active == "frankfurter" {
		rates, source, err = p.fetchFrankfurter()
	} else {
		rates, source, err = p.fetchExchangeRateAPI()
	}

	if err != nil {
		p.mu.Lock()
		p.forexErrors++
		p.forexState.Healthy = false
		p.forexState.Active = p.forexActive
		p.forexState.Errors = p.forexErrors
		if p.forexErrors >= maxProviderErrors {
			p.forexActive = flipProvider(p.forexActive)
			p.forexErrors = 0
		}
		p.mu.Unlock()
		return
	}

	p.mu.Lock()
	p.forexErrors = 0
	p.forexActive = source
	p.forexState = ProviderState{Active: source, Healthy: true, LastRefresh: time.Now(), Errors: 0}
	for i := range p.forex {
		t := &p.forex[i]
		price := p.computeForex(t, rates)
		if price <= 0 {
			continue
		}
		if t.live && t.Price > 0 {
			t.PrevClose = t.Price
			t.Change = pctChange(t.PrevClose, price)
		} else {
			t.PrevClose = price
			t.Change = 0
			t.live = true
		}
		t.Price = price
		t.Spark = appendSeries(t.Spark, []float64{price}, forexSparkLimit)
		if t.mode != forexStatic {
			t.Source = source
		}
	}
	p.mu.Unlock()
}

// computeForex derives the pair's price from USD-based conversion rates.
func (p *GlobalProvider) computeForex(t *ForexTicker, rates map[string]float64) float64 {
	switch t.mode {
	case forexDirect:
		return rates[t.code]
	case forexInverse:
		if r := rates[t.code]; r > 0 {
			return 1 / r
		}
		return 0
	case forexCross:
		// EUR/GBP = (1/EUR) / (1/GBP) = rates["GBP"] / rates["EUR"].
		if gbp, eur := rates["GBP"], rates["EUR"]; gbp > 0 && eur > 0 {
			return gbp / eur
		}
		return 0
	default:
		return t.Price // forexStatic (e.g. XAU/USD) — no live source
	}
}

func (p *GlobalProvider) fetchExchangeRateAPI() (map[string]float64, string, error) {
	u := fmt.Sprintf("%s/%s/latest/USD", exchangeRateBase, p.exchangeRateKey)
	res, err := p.client.Get(u)
	if err != nil {
		return nil, "exchangerate-api", err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, "exchangerate-api", fmt.Errorf("exchangerate-api status %d", res.StatusCode)
	}
	var body struct {
		Result          string             `json:"result"`
		ConversionRates map[string]float64 `json:"conversion_rates"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, "exchangerate-api", err
	}
	if body.Result != "success" || len(body.ConversionRates) == 0 {
		return nil, "exchangerate-api", fmt.Errorf("exchangerate-api result %q", body.Result)
	}
	return body.ConversionRates, "exchangerate-api", nil
}

func (p *GlobalProvider) fetchFrankfurter() (map[string]float64, string, error) {
	u := frankfurterBase + "?from=USD&symbols=EUR,GBP,JPY,CHF,AUD,CAD,NZD,SGD"
	res, err := p.client.Get(u)
	if err != nil {
		return nil, "frankfurter", err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, "frankfurter", fmt.Errorf("frankfurter status %d", res.StatusCode)
	}
	var body struct {
		Rates map[string]float64 `json:"rates"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil || len(body.Rates) == 0 {
		return nil, "frankfurter", fmt.Errorf("frankfurter empty rates")
	}
	return body.Rates, "frankfurter", nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func flipProvider(current string) string {
	if current == "finnhub" {
		return "yahoo"
	}
	if current == "yahoo" {
		return "finnhub"
	}
	if current == "frankfurter" {
		return "exchangerate-api"
	}
	return "frankfurter"
}

// appendSeries appends values to a rolling series capped at limit.
func appendSeries(series, values []float64, limit int) []float64 {
	out := series
	if len(out) > limit {
		out = out[len(out)-limit:]
	}
	out = append(out, values...)
	if len(out) > limit {
		out = out[len(out)-limit:]
	}
	return out
}
