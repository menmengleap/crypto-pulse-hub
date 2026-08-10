package handlers

import (
	"net/http"
	"strings"

	"cryptolytic/backend/internal/marketdata"
)

// FinnhubHandler serves Finnhub-powered research data (events calendar,
// company fundamentals, market news). The API key stays server-side — clients
// only ever read the backend's cached results.
type FinnhubHandler struct {
	finnhub *marketdata.FinnhubData
}

func NewFinnhubHandler(finnhub *marketdata.FinnhubData) *FinnhubHandler {
	return &FinnhubHandler{finnhub: finnhub}
}

// Events GET /api/finnhub/events — upcoming macro + earnings events. The macro
// economic calendar needs a paid Finnhub plan; the provider transparently
// falls back to the earnings calendar (free) when access is denied.
func (h *FinnhubHandler) Events(w http.ResponseWriter, r *http.Request) {
	res, err := h.finnhub.EventsCalendar(r.Context())
	if err != nil {
		// The fallback already degrades to an empty/unavailable result; a hard
		// error here means Finnhub itself is unreachable.
		writeServiceError(w, err)
		return
	}
	WriteOK(w, res, nil)
}

// Fundamentals GET /api/finnhub/fundamentals?symbol=AAPL — normalized company
// metrics for one supported stock symbol.
func (h *FinnhubHandler) Fundamentals(w http.ResponseWriter, r *http.Request) {
	symbol := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("symbol")))
	if symbol == "" {
		WriteError(w, http.StatusBadRequest, "INVALID_SYMBOL", "symbol is required")
		return
	}
	if !knownStockSymbol(symbol) {
		WriteError(w, http.StatusNotFound, "NOT_FOUND", "unsupported symbol")
		return
	}
	metrics, err := h.finnhub.CompanyFundamentals(r.Context(), symbol)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, metrics, nil)
}

// News GET /api/finnhub/news — recent general market headlines.
func (h *FinnhubHandler) News(w http.ResponseWriter, r *http.Request) {
	items, err := h.finnhub.MarketNews(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, items, map[string]any{"count": len(items)})
}

// knownStockSymbol reports whether a symbol is in the stock catalog the
// backend serves over /api/live/stocks (the fundamentals panel covers those).
func knownStockSymbol(symbol string) bool {
	for _, s := range marketdata.StockSymbols() {
		if s == symbol {
			return true
		}
	}
	return false
}
