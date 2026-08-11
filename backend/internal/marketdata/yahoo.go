package marketdata

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// Yahoo Finance powers the trad-fi symbols the free TWELVE DATA plan cannot
// serve: US indices (^GSPC, ^IXIC, ^DJI, ^RUT, ^VIX), the Dollar Index
// (DX-Y.NYB), CME futures (ES=F …), treasury yields (^TNX/^TYX) and silver
// spot (XAGUSD=X). It is free, unauthenticated and already the stock provider
// in global.go — the same chart endpoint, reused here with full OHLCV parsing.
//
// Each refresh pulls interval=5m&range=1d so the quote (meta price + previous
// close) and the intraday sparkline come from a single request per symbol.

// yahooChartResult is the subset of Yahoo's /v8/finance/chart payload we use.
type yahooChartResult struct {
	Price     float64
	PrevClose float64
	DayHigh   float64
	DayLow    float64
	Volume    float64
	Candles   []Candle
}

// fetchYahooChart retrieves a symbol's chart from Yahoo (oldest-first candles).
func fetchYahooChart(client *http.Client, symbol, interval, rng string) (yahooChartResult, error) {
	u := fmt.Sprintf("%s/%s?interval=%s&range=%s",
		yahooBase, url.PathEscape(symbol), url.QueryEscape(interval), url.QueryEscape(rng))
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return yahooChartResult{}, err
	}
	req.Header.Set("User-Agent", yahooUserAgent)
	res, err := client.Do(req)
	if err != nil {
		return yahooChartResult{}, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return yahooChartResult{}, fmt.Errorf("yahoo chart status %d", res.StatusCode)
	}

	var body struct {
		Chart struct {
			Result []struct {
				Meta struct {
					RegularMarketPrice   *float64 `json:"regularMarketPrice"`
					ChartPreviousClose   *float64 `json:"chartPreviousClose"`
					PreviousClose        *float64 `json:"previousClose"`
					RegularMarketVolume  *float64 `json:"regularMarketVolume"`
					RegularMarketDayHigh *float64 `json:"regularMarketDayHigh"`
					RegularMarketDayLow  *float64 `json:"regularMarketDayLow"`
				} `json:"meta"`
				Timestamp  []int64 `json:"timestamp"`
				Indicators struct {
					Quote []struct {
						Open   []*float64 `json:"open"`
						High   []*float64 `json:"high"`
						Low    []*float64 `json:"low"`
						Close  []*float64 `json:"close"`
						Volume []*float64 `json:"volume"`
					} `json:"quote"`
				} `json:"indicators"`
			} `json:"result"`
		} `json:"chart"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil || len(body.Chart.Result) == 0 {
		return yahooChartResult{}, fmt.Errorf("yahoo chart decode failed for %s", symbol)
	}
	r := body.Chart.Result[0]
	out := yahooChartResult{}

	candles := []Candle{}
	if len(r.Timestamp) > 0 && len(r.Indicators.Quote) > 0 {
		q := r.Indicators.Quote[0]
		for i, ts := range r.Timestamp {
			if i >= len(q.Open) || q.Close == nil || i >= len(q.Close) || q.Close[i] == nil || *q.Close[i] <= 0 {
				continue
			}
			candles = append(candles, Candle{
				Timestamp: ts,
				Open:      ptrOr(q.Open, i),
				High:      ptrOr(q.High, i),
				Low:       ptrOr(q.Low, i),
				Close:     *q.Close[i],
				Volume:    ptrOr(q.Volume, i),
			})
		}
	}
	out.Candles = candles

	if r.Meta.RegularMarketPrice != nil {
		out.Price = *r.Meta.RegularMarketPrice
	} else if len(candles) > 0 {
		out.Price = candles[len(candles)-1].Close
	}
	if r.Meta.ChartPreviousClose != nil {
		out.PrevClose = *r.Meta.ChartPreviousClose
	} else if r.Meta.PreviousClose != nil {
		out.PrevClose = *r.Meta.PreviousClose
	}
	if r.Meta.RegularMarketVolume != nil {
		out.Volume = *r.Meta.RegularMarketVolume
	}
	if r.Meta.RegularMarketDayHigh != nil {
		out.DayHigh = *r.Meta.RegularMarketDayHigh
	}
	if r.Meta.RegularMarketDayLow != nil {
		out.DayLow = *r.Meta.RegularMarketDayLow
	}
	if out.Price <= 0 {
		return yahooChartResult{}, fmt.Errorf("yahoo chart empty price for %s", symbol)
	}
	return out, nil
}

func ptrOr(arr []*float64, i int) float64 {
	if i < len(arr) && arr[i] != nil {
		return *arr[i]
	}
	return 0
}

// refreshYahooQuotes refreshes every Yahoo-sourced instrument (throttled to
// every 45s internally — ~20 symbols per pass, matching the existing
// GlobalProvider cadence so we don't hammer Yahoo's free API) using a 5m/1d
// chart per symbol for quote + spark.
func (p *TradFiProvider) refreshYahooQuotes() {
	p.mu.RLock()
	last := p.lastYahoo
	p.mu.RUnlock()
	if time.Since(last) < 45*time.Second {
		return
	}

	jobs := []TradInstrument{}
	for _, inst := range p.catalog {
		if inst.Provider == "yahoo" && inst.YahooSym != "" {
			jobs = append(jobs, inst)
		}
	}
	if len(jobs) == 0 {
		return
	}

	now := time.Now()
	var mu sync.Mutex
	var okCount int
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5)

	for _, inst := range jobs {
		wg.Add(1)
		go func(inst TradInstrument) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			res, err := fetchYahooChart(p.client, inst.YahooSym, "5m", "1d")
			if err != nil {
				return
			}
			p.updateQuote(TradQuote{
				Symbol:    inst.Symbol,
				Price:     res.Price,
				PrevClose: res.PrevClose,
				High:      res.DayHigh,
				Low:       res.DayLow,
				Source:    "yahoo",
			})
			if len(res.Candles) >= 2 {
				closes := make([]float64, len(res.Candles))
				for i, c := range res.Candles {
					closes[i] = c.Close
				}
				p.setSpark(inst.Symbol, closes)
			}
			mu.Lock()
			okCount++
			mu.Unlock()
		}(inst)
	}
	wg.Wait()

	p.mu.Lock()
	p.lastYahoo = now
	healthy := okCount >= len(jobs)/2
	p.states["yahoo"] = ProviderState{Active: "yahoo", Healthy: healthy, LastRefresh: now, Errors: len(jobs) - okCount}
	p.mu.Unlock()
}

// yahooHistorical returns OHLCV candles for Yahoo-sourced instruments, mapped
// to the app's canonical timeframes. Cached 5 minutes.
func (p *TradFiProvider) yahooHistorical(ctx context.Context, inst TradInstrument, tf string, limit int) ([]Candle, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	key := fmt.Sprintf("tradfi:hist:yahoo:%s:%s", inst.Symbol, tf)
	if c, ok := cacheGetJSON[[]Candle](ctx, p.cache, key); ok {
		return c, nil
	}
	interval, rng := yahooIntervalRange(tf)
	res, err := fetchYahooChart(p.client, inst.YahooSym, interval, rng)
	if err != nil {
		return nil, err
	}
	candles := res.Candles
	if len(candles) > limit {
		candles = candles[len(candles)-limit:]
	}
	_ = cacheSetJSON(ctx, p.cache, key, candles, 5*time.Minute)
	return candles, nil
}

// yahooIntervalRange maps canonical timeframes to Yahoo interval + range.
func yahooIntervalRange(tf string) (interval, rng string) {
	switch tf {
	case "1m", "5m", "15m", "30m":
		return tf, "1d"
	case "1h", "4h":
		return "1h", "5d"
	case "1w":
		return "1wk", "1y"
	default: // "", "1d"
		return "1d", "3mo"
	}
}
