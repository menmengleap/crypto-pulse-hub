package marketdata

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// TWELVE DATA — the realtime WebSocket provider for forex pairs and gold.
//
// The free plan streams realtime prices for forex + XAU/USD over
// wss://ws.twelvedata.com/v1/quotes/price; indices, DXY, CME futures and
// treasury yields 403/404 on the free key, so those are routed to Yahoo
// Finance instead. REST quote (one batched call) is the fallback when the
// socket drops, and time_series supplies historical candles (cached).

const (
	twelveRESTBase = "https://api.twelvedata.com"
	twelveWSBase   = "wss://ws.twelvedata.com/v1/quotes/price"
	twelveWSTTL    = 120 * time.Second // reset on any inbound message
	// The free plan accepts exactly these two symbols on the realtime socket
	// (verified: every other pair returns subscribe fails). The remaining
	// forex pairs rotate through the REST quote budget instead.
	twelveWSFreeSymbols = "EUR/USD,XAU/USD"
	// Free REST credit budget: 8 credits/minute, one credit per symbol in a
	// batched quote call and one per time_series request.
	twelveCreditBudget = 8
)

// twelveBudget tracks the free-plan REST credit window (8 credits per 60s).
type twelveBudget struct {
	mu   sync.Mutex
	at   time.Time
	used int
}

// take consumes n credits if they fit in the current 60s window.
func (b *twelveBudget) take(n int) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	if now.Sub(b.at) >= time.Minute {
		b.at = now
		b.used = 0
	}
	if b.used+n > twelveCreditBudget {
		return false
	}
	b.used += n
	return true
}

type twelveQuoteResp struct {
	Symbol        string `json:"symbol"`
	Name          string `json:"name"`
	Close         string `json:"close"`
	PreviousClose string `json:"previous_close"`
	Change        string `json:"change"`
	PercentChange string `json:"percent_change"`
	High          string `json:"high"`
	Low           string `json:"low"`
	Code          int    `json:"code"`
	Message       string `json:"message"`
}

// runTwelveWS owns the TWELVE DATA WebSocket connection with auto-reconnect.
func (p *TradFiProvider) runTwelveWS(ctx context.Context) {
	backoff := 5 * time.Second
	for {
		if err := p.twelveWSOnce(ctx); err != nil {
			p.mu.Lock()
			p.states["twelvedata"] = ProviderState{Active: "twelvedata", Healthy: false, LastRefresh: time.Now()}
			p.mu.Unlock()
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
	}
}

func (p *TradFiProvider) twelveWSOnce(ctx context.Context) error {
	u := fmt.Sprintf("%s?apikey=%s&timezone=UTC", twelveWSBase, url.QueryEscape(p.twelveKey))
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, u, nil)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	payload, _ := json.Marshal(map[string]any{
		"action": "subscribe",
		"params": map[string]any{"symbols": twelveWSFreeSymbols},
	})
	if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
		return err
	}
	if err := conn.SetReadDeadline(time.Now().Add(twelveWSTTL)); err != nil {
		return err
	}

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		_ = conn.SetReadDeadline(time.Now().Add(twelveWSTTL))

		var ev struct {
			Event  string `json:"event"`
			Symbol string `json:"symbol"`
			Price  string `json:"price"`
		}
		if err := json.Unmarshal(data, &ev); err != nil || ev.Event != "price" || ev.Symbol == "" {
			continue // heartbeat / subscribe-status / unknown
		}
		price := parseFloat(ev.Price)
		if price <= 0 {
			continue
		}
		p.updateQuote(TradQuote{Symbol: ev.Symbol, Price: price, Source: "twelvedata"})
		p.markWS(time.Now())
	}
}

// refreshTwelveQuotes rotates a batch of up to 8 symbols through the REST
// quote endpoint, at most once per 60s — the free plan charges one credit per
// symbol and allows 8 credits/minute, so a full rotation of the 11 symbols
// takes two passes (~2 minutes). The WebSocket only streams EUR/USD + XAU/USD
// on the free plan, so this rotation is what keeps the other pairs fresh.
func (p *TradFiProvider) refreshTwelveQuotes() {
	symbols := p.twelveSymbols()
	if len(symbols) == 0 {
		return
	}
	p.mu.RLock()
	last := p.lastTD
	p.mu.RUnlock()
	if time.Since(last) < time.Minute || !p.tdBudget.take(8) {
		return
	}
	p.mu.Lock()
	start := p.tdCursor
	p.tdCursor = (p.tdCursor + twelveCreditBudget) % len(symbols)
	p.mu.Unlock()
	batch := make([]string, 0, twelveCreditBudget)
	for i := 0; i < twelveCreditBudget; i++ {
		batch = append(batch, symbols[(start+i)%len(symbols)])
	}
	u := fmt.Sprintf("%s/quote?symbol=%s&apikey=%s",
		twelveRESTBase, url.QueryEscape(strings.Join(batch, ",")), url.QueryEscape(p.twelveKey))
	res, err := p.client.Get(u)
	if err != nil {
		return
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return
	}
	var raw map[string]twelveQuoteResp
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		return
	}
	now := time.Now()
	updated := 0
	for sym, q := range raw {
		if !p.isTwelveSymbol(sym) {
			continue
		}
		price := parseFloat(q.Close)
		if price <= 0 {
			continue
		}
		p.updateQuote(TradQuote{
			Symbol:    sym,
			Price:     price,
			PrevClose: parseFloat(q.PreviousClose),
			High:      parseFloat(q.High),
			Low:       parseFloat(q.Low),
			Source:    "twelvedata",
		})
		updated++
	}
	if updated > 0 {
		p.mu.Lock()
		p.lastTD = now
		p.states["twelvedata"] = ProviderState{Active: "twelvedata", Healthy: true, LastRefresh: now}
		p.mu.Unlock()
	}
}

// refreshTDSparks replaces the forex/gold sparks with a real 5m series. The
// time_series calls are paced to one credit per 8s so a cold-cache pass never
// bursts past the 8-credit/minute budget (cached 5 minutes afterwards).
func (p *TradFiProvider) refreshTDSparks(ctx context.Context) {
	for _, inst := range p.catalog {
		if !inst.Twelve {
			continue
		}
		candles, err := p.twelveHistorical(ctx, inst, "5m", 60)
		if err != nil || len(candles) < 5 {
			if errors.Is(err, errTwelveBudget) {
				return // budget spent — try again on the next 5-minute tick
			}
			continue
		}
		closes := make([]float64, len(candles))
		for i, c := range candles {
			closes[i] = c.Close
		}
		p.setSpark(inst.Symbol, closes)
		time.Sleep(8 * time.Second)
	}
}

// twelveHistorical fetches OHLCV candles from time_series (newest-first on the
// wire, returned oldest-first like the rest of the API). Cached 5 minutes.
func (p *TradFiProvider) twelveHistorical(ctx context.Context, inst TradInstrument, tf string, limit int) ([]Candle, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	key := fmt.Sprintf("tradfi:hist:td:%s:%s", inst.Symbol, tf)
	if c, ok := cacheGetJSON[[]Candle](ctx, p.cache, key); ok {
		return c, nil
	}
	// Cache miss: consume one credit. When the minute budget is exhausted the
	// caller is told to try again on a later pass.
	if !p.tdBudget.take(1) {
		return nil, errTwelveBudget
	}
	u := fmt.Sprintf("%s/time_series?symbol=%s&interval=%s&outputsize=%d&apikey=%s",
		twelveRESTBase, url.QueryEscape(inst.Symbol), twelveInterval(tf), limit, url.QueryEscape(p.twelveKey))
	res, err := p.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, fmt.Errorf("twelvedata time_series status %d", res.StatusCode)
	}
	var body struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Values  []struct {
			Datetime string `json:"datetime"`
			Open     string `json:"open"`
			High     string `json:"high"`
			Low      string `json:"low"`
			Close    string `json:"close"`
			Volume   string `json:"volume"`
		} `json:"values"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return nil, err
	}
	if body.Status != "" && body.Status != "ok" {
		return nil, fmt.Errorf("twelvedata time_series: %s", body.Message)
	}
	// Values arrive newest-first — reverse to oldest-first.
	candles := make([]Candle, 0, len(body.Values))
	for i := len(body.Values) - 1; i >= 0; i-- {
		v := body.Values[i]
		closeV := parseFloat(v.Close)
		if closeV <= 0 {
			continue
		}
		ts := parseTwelveTime(v.Datetime)
		if ts == 0 {
			continue // unparseable datetime would render as epoch 0
		}
		candles = append(candles, Candle{
			Timestamp: ts,
			Open:      parseFloat(v.Open),
			High:      parseFloat(v.High),
			Low:       parseFloat(v.Low),
			Close:     closeV,
			Volume:    parseFloat(v.Volume),
		})
	}
	if len(candles) == 0 {
		return nil, fmt.Errorf("twelvedata time_series empty for %s", inst.Symbol)
	}
	_ = cacheSetJSON(ctx, p.cache, key, candles, 5*time.Minute)
	return candles, nil
}

// errTwelveBudget reports that the free-plan credit budget was exhausted.
var errTwelveBudget = fmt.Errorf("twelvedata: REST credit budget exhausted")

// twelveInterval maps the app's canonical timeframe labels to TWELVE DATA's.
func twelveInterval(tf string) string {
	switch tf {
	case "1m":
		return "1min"
	case "5m":
		return "5min"
	case "15m":
		return "15min"
	case "30m":
		return "30min"
	case "1h":
		return "1h"
	case "4h":
		return "4h"
	case "1w":
		return "1week"
	default: // "", "1d"
		return "1day"
	}
}

// parseTwelveTime parses TWELVE DATA datetime strings ("2026-08-11 12:18:00"
// or "2026-08-11") into unix seconds.
func parseTwelveTime(s string) int64 {
	for _, layout := range []string{"2006-01-02 15:04:05", "2006-01-02 15:04", "2006-01-02"} {
		if t, err := time.ParseInLocation(layout, s, time.UTC); err == nil {
			return t.Unix()
		}
	}
	return 0
}
