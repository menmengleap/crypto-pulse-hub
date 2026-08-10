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
	"strings"
	"sync"
	"time"
)

// FinnhubData serves Finnhub-powered realtime research data to the frontend —
// always server-side. The API key never leaves the backend: clients only read
// the cached results over /api/finnhub/*.
//
//	events       → calendar/economic (primary) ⇄ calendar/earnings (fallback)
//	fundamentals → stock/metric?metric=all
//	news         → news?category=general
//
// The macro economic calendar requires a paid Finnhub plan; the provider
// detects the access-denied response and transparently falls back to the
// earnings calendar (free on all plans), mirroring the project's provider
// failover behaviour for stocks/forex.

const (
	finnhubRoot = "https://finnhub.io/api/v1"

	eventsTTL       = 10 * time.Minute
	fundamentalsTTL = 15 * time.Minute
	newsTTL         = 5 * time.Minute

	// eventsWindowDays is how far ahead (and behind) the calendar is fetched.
	eventsWindowDays = 10
)

// EventItem is one row in the events calendar (macro economic or corporate
// earnings). Pointer values keep "unknown" distinct from zero.
type EventItem struct {
	ID       string   `json:"id"`
	Date     string   `json:"date"` // YYYY-MM-DD
	Time     string   `json:"time"` // HH:MM or empty when not announced
	Event    string   `json:"event"`
	Country  string   `json:"country"`
	Symbol   string   `json:"symbol"`
	Kind     string   `json:"kind"` // "economic" | "earnings"
	Actual   *float64 `json:"actual,omitempty"`
	Estimate *float64 `json:"estimate,omitempty"`
	Prev     *float64 `json:"prev,omitempty"`
	Unit     string   `json:"unit,omitempty"`
}

// EventsResult is the calendar response; Source tells the UI which feed backed
// it ("economic", "earnings" or "unavailable").
type EventsResult struct {
	Source string      `json:"source"`
	Events []EventItem `json:"events"`
}

// CompanyFundamentals is the normalized stock/metric result for one symbol.
type CompanyFundamentals struct {
	Symbol           string    `json:"symbol"`
	PeTTM            float64   `json:"peTTM,omitempty"`
	PeAnnual         float64   `json:"peAnnual,omitempty"`
	EpsTTM           float64   `json:"epsTTM,omitempty"`
	EpsGrowth3Y      float64   `json:"epsGrowth3Y,omitempty"`
	RevenueGrowth3Y  float64   `json:"revenueGrowth3Y,omitempty"`
	RevenueGrowthTTM float64   `json:"revenueGrowthTTMYoy,omitempty"`
	DividendYield    float64   `json:"dividendYield,omitempty"`
	Beta             float64   `json:"beta,omitempty"`
	RoeTTM           float64   `json:"roeTTM,omitempty"`
	GrossMargin      float64   `json:"grossMargin,omitempty"`
	CurrentRatio     float64   `json:"currentRatio,omitempty"`
	Week52High       float64   `json:"week52High,omitempty"`
	Week52Low        float64   `json:"week52Low,omitempty"`
	Week52HighDate   string    `json:"week52HighDate,omitempty"`
	Week52LowDate    string    `json:"week52LowDate,omitempty"`
	Updated          time.Time `json:"updated"`
}

// NewsHeadline is one Finnhub general-news item (already normalized).
type NewsHeadline struct {
	ID       int64  `json:"id"`
	Category string `json:"category"`
	Headline string `json:"headline"`
	Summary  string `json:"summary"`
	Source   string `json:"source"`
	URL      string `json:"url"`
	Image    string `json:"image"`
	Related  string `json:"related"`
	Time     int64  `json:"time"` // unix seconds
}

// FinnhubData holds the key, an HTTP client and per-endpoint caches.
type FinnhubData struct {
	client *http.Client
	apiKey string

	mu             sync.Mutex
	events         EventsResult
	eventsAt       time.Time
	fundamentals   map[string]CompanyFundamentals
	fundamentalsAt map[string]time.Time
	news           []NewsHeadline
	newsAt         time.Time
}

// NewFinnhubData builds the provider. Empty key disables live fetching (the
// handlers then return empty results instead of erroring).
func NewFinnhubData(apiKey string) *FinnhubData {
	return &FinnhubData{
		client:         &http.Client{Timeout: 12 * time.Second},
		apiKey:         apiKey,
		fundamentals:   map[string]CompanyFundamentals{},
		fundamentalsAt: map[string]time.Time{},
	}
}

// ---------------------------------------------------------------------------
// Events calendar — economic (paid) ⇄ earnings (free fallback)
// ---------------------------------------------------------------------------

// EventsCalendar returns the upcoming events feed. It tries the macro economic
// calendar first; when the key has no access it falls back to corporate
// earnings for the same window. Cached for eventsTTL; the fetch runs under the
// cache lock so concurrent cold-cache requests share one Finnhub call
// (single-flight, keeping well inside the free-tier rate limit).
func (f *FinnhubData) EventsCalendar(ctx context.Context) (EventsResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if time.Since(f.eventsAt) < eventsTTL {
		return f.events, nil
	}

	from, to := calendarWindow()

	// Primary: macro economic calendar (needs a paid plan).
	events, err := f.fetchEconomic(ctx, from, to)
	if err == nil && len(events) > 0 {
		res := EventsResult{Source: "economic", Events: events}
		f.events = res
		f.eventsAt = time.Now()
		return res, nil
	}

	// Fallback: corporate earnings calendar (free on all plans).
	earnings, eerr := f.fetchEarnings(ctx, from, to)
	source := "earnings"
	if eerr != nil {
		source = "unavailable"
	}
	res := EventsResult{Source: source, Events: earnings}
	f.events = res
	f.eventsAt = time.Now()
	return res, nil
}

func calendarWindow() (string, string) {
	now := time.Now().UTC()
	return now.Format("2006-01-02"), now.AddDate(0, 0, eventsWindowDays).Format("2006-01-02")
}

func (f *FinnhubData) fetchEconomic(ctx context.Context, from, to string) ([]EventItem, error) {
	u := finnhubRoot + "/calendar/economic?from=" + url.QueryEscape(from) +
		"&to=" + url.QueryEscape(to) + "&token=" + url.QueryEscape(f.apiKey)
	body, err := f.get(ctx, u)
	if err != nil {
		return nil, err
	}
	var raw struct {
		Error    string `json:"error"`
		Calendar []struct {
			Actual   any    `json:"actual"`
			Prev     any    `json:"prev"`
			Country  string `json:"country"`
			Unit     string `json:"unit"`
			Estimate any    `json:"estimate"`
			Event    string `json:"event"`
			Time     string `json:"time"`
		} `json:"economicCalendar"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	if raw.Error != "" || len(raw.Calendar) == 0 {
		return nil, fmt.Errorf("finnhub economic calendar: %s", raw.Error)
	}
	items := make([]EventItem, 0, len(raw.Calendar))
	for i, e := range raw.Calendar {
		items = append(items, EventItem{
			ID:       "eco-" + strconv.Itoa(i) + "-" + e.Time,
			Date:     datePart(e.Time),
			Time:     timePart(e.Time),
			Event:    e.Event,
			Country:  strings.ToUpper(e.Country),
			Kind:     "economic",
			Actual:   numPtr(e.Actual),
			Estimate: numPtr(e.Estimate),
			Prev:     numPtr(e.Prev),
			Unit:     e.Unit,
		})
	}
	sort.Slice(items, func(a, b int) bool { return items[a].Date+items[a].Time < items[b].Date+items[b].Time })
	return items, nil
}

func (f *FinnhubData) fetchEarnings(ctx context.Context, from, to string) ([]EventItem, error) {
	u := finnhubRoot + "/calendar/earnings?from=" + url.QueryEscape(from) +
		"&to=" + url.QueryEscape(to) + "&token=" + url.QueryEscape(f.apiKey)
	body, err := f.get(ctx, u)
	if err != nil {
		return nil, err
	}
	var raw struct {
		Error    string `json:"error"`
		Calendar []struct {
			Symbol          string `json:"symbol"`
			Date            string `json:"date"`
			Hour            string `json:"hour"`
			Quarter         int    `json:"quarter"`
			Year            int    `json:"year"`
			EpsEstimate     any    `json:"epsEstimate"`
			EpsActual       any    `json:"epsActual"`
			RevenueEstimate any    `json:"revenueEstimate"`
			RevenueActual   any    `json:"revenueActual"`
		} `json:"earningsCalendar"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	if raw.Error != "" || len(raw.Calendar) == 0 {
		return nil, fmt.Errorf("finnhub earnings calendar: %s", raw.Error)
	}
	items := make([]EventItem, 0, len(raw.Calendar))
	for i, e := range raw.Calendar {
		title := "Earnings"
		if e.Year > 0 {
			title = fmt.Sprintf("Q%d %d earnings", e.Quarter, e.Year)
		}
		items = append(items, EventItem{
			ID:       "ern-" + strconv.Itoa(i) + "-" + e.Symbol + "-" + e.Date,
			Date:     e.Date,
			Time:     e.Hour,
			Event:    title,
			Symbol:   strings.ToUpper(e.Symbol),
			Kind:     "earnings",
			Actual:   numPtr(e.EpsActual),
			Estimate: numPtr(e.EpsEstimate),
		})
	}
	sort.Slice(items, func(a, b int) bool { return items[a].Date+items[a].Time < items[b].Date+items[b].Time })
	return items, nil
}

// ---------------------------------------------------------------------------
// Company fundamentals
// ---------------------------------------------------------------------------

// CompanyFundamentals returns normalized metrics for a supported symbol.
// Cached per symbol for fundamentalsTTL (fetch runs under the cache lock).
func (f *FinnhubData) CompanyFundamentals(ctx context.Context, symbol string) (CompanyFundamentals, error) {
	key := strings.ToUpper(symbol)

	f.mu.Lock()
	defer f.mu.Unlock()
	if at, ok := f.fundamentalsAt[key]; ok && time.Since(at) < fundamentalsTTL {
		return f.fundamentals[key], nil
	}

	u := finnhubRoot + "/stock/metric?symbol=" + url.QueryEscape(key) +
		"&metric=all&token=" + url.QueryEscape(f.apiKey)
	body, err := f.get(ctx, u)
	if err != nil {
		return CompanyFundamentals{}, err
	}
	var raw struct {
		Error  string                     `json:"error"`
		Symbol string                     `json:"symbol"`
		Metric map[string]json.RawMessage `json:"metric"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return CompanyFundamentals{}, err
	}
	if raw.Error != "" {
		return CompanyFundamentals{}, fmt.Errorf("finnhub fundamentals: %s", raw.Error)
	}
	m := raw.Metric
	out := CompanyFundamentals{
		Symbol:           firstNonEmpty(raw.Symbol, key),
		PeTTM:            fnum(m, "peTTM"),
		PeAnnual:         fnum(m, "peAnnual"),
		EpsTTM:           fnum(m, "epsTTM"),
		EpsGrowth3Y:      fnum(m, "epsGrowth3Y"),
		RevenueGrowth3Y:  fnum(m, "revenueGrowth3Y"),
		RevenueGrowthTTM: fnum(m, "revenueGrowthTTMYoy"),
		DividendYield:    fnum(m, "currentDividendYieldTTM"),
		Beta:             fnum(m, "beta"),
		RoeTTM:           fnum(m, "roeTTM"),
		GrossMargin:      fnum(m, "grossMarginTTM"),
		CurrentRatio:     fnum(m, "currentRatioQuarterly"),
		Week52High:       fnum(m, "52WeekHigh"),
		Week52Low:        fnum(m, "52WeekLow"),
		Week52HighDate:   str(m, "52WeekHighDate"),
		Week52LowDate:    str(m, "52WeekLowDate"),
		Updated:          time.Now().UTC(),
	}

	f.fundamentals[key] = out
	f.fundamentalsAt[key] = time.Now()
	return out, nil
}

// ---------------------------------------------------------------------------
// Market news
// ---------------------------------------------------------------------------

// MarketNews returns recent general market headlines. Cached for newsTTL
// (fetch runs under the cache lock).
func (f *FinnhubData) MarketNews(ctx context.Context) ([]NewsHeadline, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if time.Since(f.newsAt) < newsTTL {
		return append([]NewsHeadline(nil), f.news...), nil
	}

	u := finnhubRoot + "/news?category=general&token=" + url.QueryEscape(f.apiKey)
	body, err := f.get(ctx, u)
	if err != nil {
		return nil, err
	}
	var raw []struct {
		ID       int64  `json:"id"`
		Category string `json:"category"`
		Headline string `json:"headline"`
		Summary  string `json:"summary"`
		Source   string `json:"source"`
		URL      string `json:"url"`
		Image    string `json:"image"`
		Related  string `json:"related"`
		Datetime int64  `json:"datetime"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	items := make([]NewsHeadline, 0, len(raw))
	for _, n := range raw {
		if n.Headline == "" {
			continue
		}
		items = append(items, NewsHeadline{
			ID:       n.ID,
			Category: n.Category,
			Headline: n.Headline,
			Summary:  n.Summary,
			Source:   n.Source,
			URL:      n.URL,
			Image:    n.Image,
			Related:  n.Related,
			Time:     n.Datetime,
		})
	}

	f.news = items
	f.newsAt = time.Now()
	return items, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// get performs a GET and returns the raw body; non-2xx responses become errors.
func (f *FinnhubData) get(ctx context.Context, u string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	res, err := f.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil, fmt.Errorf("finnhub status %d", res.StatusCode)
	}
	return io.ReadAll(res.Body)
}

// fnum reads a float64 from a raw metric value (handles numbers, numeric
// strings and nulls).
func fnum(m map[string]json.RawMessage, key string) float64 {
	raw, ok := m[key]
	if !ok || len(raw) == 0 || string(raw) == "null" {
		return 0
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case string:
		f, _ := strconv.ParseFloat(strings.TrimSpace(n), 64)
		return f
	}
	return 0
}

func str(m map[string]json.RawMessage, key string) string {
	raw, ok := m[key]
	if !ok {
		return ""
	}
	var s string
	_ = json.Unmarshal(raw, &s)
	return s
}

// numPtr converts a possibly-null numeric value to a pointer.
func numPtr(v any) *float64 {
	switch n := v.(type) {
	case nil:
		return nil
	case float64:
		return &n
	case string:
		if s := strings.TrimSpace(n); s != "" {
			f, err := strconv.ParseFloat(s, 64)
			if err == nil {
				return &f
			}
		}
	}
	return nil
}

// datePart/timePart split a Finnhub ISO timestamp ("2026-08-12T12:30:00.000Z").
func datePart(iso string) string {
	if len(iso) >= 10 {
		return iso[:10]
	}
	return iso
}

func timePart(iso string) string {
	if len(iso) >= 16 {
		return iso[11:16]
	}
	return ""
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
