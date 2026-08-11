package marketdata

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

const avBase = "https://www.alphavantage.co/query"

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
func (p *TradFiProvider) refreshAVMacro() {
	now := time.Now()
	var latestUS02Y float64
	okCount := 0

	for _, ep := range avEndpoints {
		pts, err := p.avSeriesFetch(ep.function, ep.extra)
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
		// Alpha Vantage free: max 1 request/second.
		time.Sleep(1500 * time.Millisecond)
	}

	p.mu.Lock()
	p.macro.UpdatedAt = now
	p.avAt = now
	healthy := okCount >= len(avEndpoints)/2
	p.states["alphavantage"] = ProviderState{Active: "alphavantage", Healthy: healthy, LastRefresh: now}
	p.mu.Unlock()

	// Anchor the US02Y quote (no realtime source) to the AV reading.
	if latestUS02Y > 0 {
		p.updateQuote(TradQuote{Symbol: "US02Y", Price: latestUS02Y, Source: "alphavantage"})
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
