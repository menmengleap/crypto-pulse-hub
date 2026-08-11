package marketdata

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Alpha Vantage — the historical macro provider. It serves:
//
//	TREASURY_YIELD 10y/2y/30y monthly yield history
//	INFLATION      US annual inflation rate (CPI, monthly)
//	WTI / BRENT / NATURAL_GAS monthly commodity price history
//
// The free plan allows 25 requests/day, so the whole macro block is refreshed
// on a 12h cadence (7 calls per cycle) plus a single-flight on-demand refresh
// when a Macro() read finds the cache stale. The US02Y quote — which has no
// realtime feed anywhere in our provider set — is anchored to the latest AV
// treasury reading.

const (
	avBase       = "https://www.alphavantage.co/query"
	macroCacheKey = "tradfi:macro"
)

// avEndpoint describes one Alpha Vantage series fetch.
type avEndpoint struct {
	key      string // cache/struct key
	function string // AV function name
	extra    string // extra query params (interval, maturity, …)
}

var avEndpoints = []avEndpoint{
	{key: "us10y", function: "TREASURY_YIELD", extra: "&interval=1mo&maturity=10year"},
	{key: "us02y", function: "TREASURY_YIELD", extra: "&interval=1mo&maturity=2year"},
	{key: "us30y", function: "TREASURY_YIELD", extra: "&interval=1mo&maturity=30year"},
	{key: "inflation", function: "INFLATION", extra: ""},
	{key: "wti", function: "WTI", extra: "&interval=monthly"},
	{key: "brent", function: "BRENT", extra: "&interval=monthly"},
	{key: "natural_gas", function: "NATURAL_GAS", extra: "&interval=monthly"},
}

// refreshAVMacro fetches the full macro block. Callers never hold the lock.
// The result is persisted to the shared cache (Redis / memory) so later cold
// starts reuse it instead of burning the Alpha Vantage daily quota again.
func (p *TradFiProvider) refreshAVMacro(ctx context.Context) {
	now := time.Now()
	var latestUS02Y float64
	okCount := 0

	for _, ep := range avEndpoints {
		pts, err := p.avSeriesFetch(ep.function, ep.extra)
		// Alpha Vantage free tier enforces 1 request/second.
		time.Sleep(1500 * time.Millisecond)

		// The AV free tier sometimes blocks datacenter egress (e.g. Render's
		// IP range) — transparently fall back to the St. Louis Fed's keyless
		// CSV download for the same series.
		if err != nil || len(pts) == 0 {
			if fb := fredFor(ep.key); fb != nil {
				if pts, err = p.fredFetch(ctx, fb); err == nil && len(pts) > 0 {
					log.Printf("macro %s: Alpha Vantage failed, using FRED %s", ep.key, fb.fredID)
				} else {
					log.Printf("macro %s failed (av + fred %s): %v", ep.key, fb.fredID, err)
				}
			} else {
				log.Printf("macro %s: Alpha Vantage failed: %v", ep.key, err)
			}
		}
		if err != nil || len(pts) == 0 {
			continue
		}
		p.mu.Lock()
		switch ep.key {
		case "inflation":
			p.macro.Inflation = pts
		case "us10y", "us02y", "us30y":
			if p.macro.Treasury == nil {
				p.macro.Treasury = map[string][]MacroPoint{}
			}
			p.macro.Treasury[ep.key] = pts
			if ep.key == "us02y" {
				latestUS02Y = pts[0].Value
			}
		default:
			if p.macro.Commodities == nil {
				p.macro.Commodities = map[string][]MacroPoint{}
			}
			p.macro.Commodities[ep.key] = pts
		}
		p.mu.Unlock()
		okCount++
	}

	p.mu.Lock()
	p.macro.UpdatedAt = now
	p.avAt = now
	healthy := okCount >= len(avEndpoints)/2
	p.states["alphavantage"] = ProviderState{Active: "alphavantage", Healthy: healthy, LastRefresh: now}
	snapshot := p.macro
	p.mu.Unlock()

	// Anchor the US02Y quote (no realtime source) to the AV reading.
	if latestUS02Y > 0 {
		p.updateQuote(TradQuote{Symbol: "US02Y", Price: latestUS02Y, Source: "alphavantage"})
	}

	// Persist whatever succeeded so the next cold start reuses it.
	if okCount > 0 {
		_ = cacheSetJSON(ctx, p.cache, macroCacheKey, snapshot, 8*time.Hour)
	}
}

/* ---------------------------------------------------------------------------
 * FRED fallback (St. Louis Fed — keyless CSV download)
 * ------------------------------------------------------------------------- */

// fredFallback maps a macro key to its FRED series id.
type fredFallback struct {
	key    string
	fredID string
	cpi    bool // compute YoY % from the monthly consumer-price index
}

var fredFallbacks = []fredFallback{
	{key: "us10y", fredID: "DGS10"},
	{key: "us02y", fredID: "DGS2"},
	{key: "us30y", fredID: "DGS30"},
	{key: "inflation", fredID: "CPIAUCSL", cpi: true},
	{key: "wti", fredID: "DCOILWTICO"},
	{key: "brent", fredID: "DCOILBRENTEU"},
	{key: "natural_gas", fredID: "MHHNGSP"},
}

func fredFor(key string) *fredFallback {
	for i := range fredFallbacks {
		if fredFallbacks[i].key == key {
			return &fredFallbacks[i]
		}
	}
	return nil
}

// fredFetch downloads one series from FRED's keyless CSV endpoint and returns
// monthly MacroPoints newest-first (matching the Alpha Vantage ordering).
func (p *TradFiProvider) fredFetch(ctx context.Context, fb *fredFallback) ([]MacroPoint, error) {
	u := fmt.Sprintf("https://fred.stlouisfed.org/graph/fredgraph.csv?id=%s", url.QueryEscape(fb.fredID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	res, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, fmt.Errorf("fred %s status %d", fb.fredID, res.StatusCode)
	}
	records, err := csv.NewReader(res.Body).ReadAll()
	if err != nil {
		return nil, err
	}

	dates := make([]string, 0, len(records))
	values := make([]float64, 0, len(records))
	for _, rec := range records[1:] { // skip header
		if len(rec) < 2 {
			continue
		}
		date := strings.TrimSpace(rec[0])
		val := strings.TrimSpace(rec[1])
		if date == "" || val == "" || val == "." {
			continue
		}
		v := parseFloat(val)
		if v <= 0 {
			continue
		}
		dates = append(dates, date)
		values = append(values, v)
	}
	if len(dates) == 0 {
		return nil, fmt.Errorf("fred %s: no data", fb.fredID)
	}

	if fb.cpi {
		// YoY inflation from the monthly CPI index.
		out := []MacroPoint{}
		for i := 12; i < len(values); i++ {
			if values[i-12] <= 0 {
				continue
			}
			out = append(out, MacroPoint{
				Date:  dates[i][:7],
				Value: (values[i]/values[i-12] - 1) * 100,
			})
		}
		if len(out) == 0 {
			return nil, fmt.Errorf("fred %s: no inflation history", fb.fredID)
		}
		reverseMacro(out)
		return out, nil
	}

	// Daily series (yields, oil) → last observation per month, newest-first.
	monthly := []MacroPoint{}
	for i, date := range dates {
		month := date[:7]
		if n := len(monthly); n == 0 || monthly[n-1].Date != month {
			monthly = append(monthly, MacroPoint{Date: month, Value: values[i]})
		} else {
			monthly[n-1].Value = values[i]
		}
	}
	reverseMacro(monthly)
	return monthly, nil
}

func reverseMacro(pts []MacroPoint) {
	for i, j := 0, len(pts)-1; i < j; i, j = i+1, j-1 {
		pts[i], pts[j] = pts[j], pts[i]
	}
}

// avSeriesFetch calls one Alpha Vantage endpoint and normalizes the series
// (newest first, matching the AV response order).
func (p *TradFiProvider) avSeriesFetch(function, extra string) ([]MacroPoint, error) {
	u := fmt.Sprintf("%s?function=%s%s&apikey=%s",
		avBase, url.QueryEscape(function), extra, url.QueryEscape(p.avKey))
	res, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, fmt.Errorf("alphavantage %s status %d", function, res.StatusCode)
	}
	var body struct {
		Information string `json:"Information"`
		Note        string `json:"Note"`
		Data        []struct {
			Date  string `json:"date"`
			Value string `json:"value"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, err
	}
	if body.Information != "" {
		return nil, fmt.Errorf("alphavantage: %s", body.Information)
	}
	if body.Note != "" {
		return nil, fmt.Errorf("alphavantage: %s", body.Note)
	}
	if len(body.Data) == 0 {
		return nil, fmt.Errorf("alphavantage %s: empty data", function)
	}
	out := make([]MacroPoint, 0, len(body.Data))
	for _, d := range body.Data {
		v := parseFloat(d.Value)
		if v <= 0 {
			continue
		}
		date := d.Date
		if len(date) >= 7 {
			date = date[:7] // "2026-07-01" → "2026-07"
		}
		out = append(out, MacroPoint{Date: date, Value: v})
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("alphavantage %s: no usable values", function)
	}
	return out, nil
}
