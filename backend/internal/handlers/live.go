package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"cryptolytic/backend/internal/marketdata"
)

// LiveHandler serves live market data that the backend fetches from external
// providers (Binance, exchangerate-api/Frankfurter, Yahoo/Finnhub). Clients
// never call providers directly — everything flows User → Frontend → Backend.
type LiveHandler struct {
	live   *marketdata.LiveProvider
	global *marketdata.GlobalProvider
}

func NewLiveHandler(live *marketdata.LiveProvider, global *marketdata.GlobalProvider) *LiveHandler {
	return &LiveHandler{live: live, global: global}
}

// Markets GET /api/live/markets — live crypto snapshots (Binance, cached).
func (h *LiveHandler) Markets(w http.ResponseWriter, r *http.Request) {
	snaps, err := h.live.Snapshots()
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, snaps, map[string]any{"source": "binance"})
}

// Global GET /api/live/global — global metrics + sentiment + fear & greed.
func (h *LiveHandler) Global(w http.ResponseWriter, r *http.Request) {
	sentiment, err := h.live.Sentiment()
	if err != nil {
		sentiment = marketdata.CompositeSentiment{}
	}
	WriteOK(w, map[string]any{
		"metrics":   h.live.GlobalMetrics(),
		"sentiment": sentiment,
		"fearGreed": h.live.FearGreed(),
	}, nil)
}

// Klines GET /api/live/klines?symbol=BTC&timeframe=4h&limit=200
func (h *LiveHandler) Klines(w http.ResponseWriter, r *http.Request) {
	symbol := strings.ToUpper(r.URL.Query().Get("symbol"))
	if symbol == "" {
		WriteError(w, http.StatusBadRequest, "INVALID_SYMBOL", "symbol is required")
		return
	}
	if !h.live.KnownSymbol(symbol) {
		WriteError(w, http.StatusNotFound, "NOT_FOUND", "unknown symbol")
		return
	}
	tf := r.URL.Query().Get("timeframe")
	if tf == "" {
		tf = "4h"
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 200
	}

	candles, err := h.live.Candles(symbol, tf, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, candles, map[string]any{"symbol": symbol, "timeframe": tf, "count": len(candles)})
}

// Stocks GET /api/live/stocks — live equity tickers with provider failover.
func (h *LiveHandler) Stocks(w http.ResponseWriter, r *http.Request) {
	snapshot := h.global.Snapshot()
	WriteOK(w, snapshot.Stocks, map[string]any{"providers": snapshot.Providers["stocks"]})
}

// Forex GET /api/live/forex — live FX tickers with provider failover.
func (h *LiveHandler) Forex(w http.ResponseWriter, r *http.Request) {
	snapshot := h.global.Snapshot()
	WriteOK(w, snapshot.Forex, map[string]any{"providers": snapshot.Providers["forex"]})
}

// Providers GET /api/live/providers — active provider + health per asset class.
func (h *LiveHandler) Providers(w http.ResponseWriter, r *http.Request) {
	g := h.global.Snapshot()
	WriteOK(w, map[string]any{
		"crypto": h.live.Status(),
		"forex":  g.Providers["forex"],
		"stocks": g.Providers["stocks"],
	}, map[string]any{"updatedAt": time.Now().UTC()})
}
