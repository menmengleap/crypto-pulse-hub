package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"cryptolytic/backend/internal/marketdata"
)

// LiveHandler serves live market data that the backend fetches from external
// providers (Binance, exchangerate-api/Frankfurter, Yahoo/Finnhub, TWELVE
// DATA, Alpha Vantage). Clients never call providers directly — everything
// flows User → Frontend → Backend.
type LiveHandler struct {
	live   *marketdata.LiveProvider
	global *marketdata.GlobalProvider
	tradfi *marketdata.TradFiProvider
}

func NewLiveHandler(live *marketdata.LiveProvider, global *marketdata.GlobalProvider, tradfi *marketdata.TradFiProvider) *LiveHandler {
	return &LiveHandler{live: live, global: global, tradfi: tradfi}
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

// Sparks GET /api/live/sparks — 15m close series for every crypto symbol in
// one response, so the frontend seeds all sparklines with a single request
// instead of firing one /klines call per symbol (the source of 429 bursts).
func (h *LiveHandler) Sparks(w http.ResponseWriter, r *http.Request) {
	sparks := h.live.Sparks()
	WriteOK(w, sparks, map[string]any{"timeframe": "15m", "count": len(sparks)})
}

// Providers GET /api/live/providers — active provider + health per asset class.
func (h *LiveHandler) Providers(w http.ResponseWriter, r *http.Request) {
	g := h.global.Snapshot()
	WriteOK(w, map[string]any{
		"crypto":       h.live.Status(),
		"forex":        g.Providers["forex"],
		"stocks":       g.Providers["stocks"],
		"tradfi":       h.tradfi.Status(),
	}, map[string]any{"updatedAt": time.Now().UTC()})
}

// TradFi GET /api/live/tradfi — the full traditional-markets quote snapshot
// (forex, indices, DXY, commodities, futures, bonds). Realtime fans out over
// the WebSocket hub (tradfi_snapshot, ~500ms); this REST call hydrates the
// initial page and covers WS outages.
func (h *LiveHandler) TradFi(w http.ResponseWriter, r *http.Request) {
	WriteOK(w, h.tradfi.Quotes(), map[string]any{"sources": h.tradfi.Status()})
}

// TradFiMacro GET /api/live/tradfi/macro — Alpha Vantage macro block: treasury
// yield history, US inflation and commodity history (monthly).
func (h *LiveHandler) TradFiMacro(w http.ResponseWriter, r *http.Request) {
	WriteOK(w, h.tradfi.Macro(), nil)
}

// TradFiHistory GET /api/live/tradfi/history?symbol=SPX&interval=1d&limit=200
// — OHLCV candles for traditional-market instruments (REST, cached 5 min).
func (h *LiveHandler) TradFiHistory(w http.ResponseWriter, r *http.Request) {
	symbol := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("symbol")))
	if symbol == "" {
		WriteError(w, http.StatusBadRequest, "INVALID_SYMBOL", "symbol is required")
		return
	}
	if !h.tradfi.KnownSymbol(symbol) {
		WriteError(w, http.StatusNotFound, "NOT_FOUND", "unknown trad-fi symbol")
		return
	}
	tf := r.URL.Query().Get("interval")
	if tf == "" {
		tf = "1d"
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 200
	}
	candles, err := h.tradfi.Historical(r.Context(), symbol, tf, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, candles, map[string]any{"symbol": symbol, "interval": tf, "count": len(candles)})
}
