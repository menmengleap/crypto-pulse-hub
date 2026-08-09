package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"cryptolytic/backend/internal/marketdata"
	"cryptolytic/backend/internal/repositories"
)

type MarketHandler struct {
	market *repositories.MarketRepo
}

func NewMarketHandler(market *repositories.MarketRepo) *MarketHandler {
	return &MarketHandler{market: market}
}

// ListMarkets GET /api/markets
func (h *MarketHandler) ListMarkets(w http.ResponseWriter, r *http.Request) {
	listings, err := h.market.ListMarkets(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, listings, nil)
}

// GetMarket GET /api/markets/:symbol
func (h *MarketHandler) GetMarket(w http.ResponseWriter, r *http.Request) {
	symbol := strings.ToUpper(r.PathValue("symbol"))
	asset, err := h.market.GetAssetBySymbol(r.Context(), symbol)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	snapshot, err := h.market.GetSnapshot(r.Context(), asset.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	indicators, err := h.market.ListIndicators(r.Context(), asset.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{"asset": asset, "snapshot": snapshot, "indicators": indicators}, nil)
}

// GetHistory GET /api/markets/:symbol/history?timeframe=4h&limit=200
func (h *MarketHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	symbol := strings.ToUpper(r.PathValue("symbol"))
	tf := r.URL.Query().Get("timeframe")
	if tf == "" {
		tf = "4h"
	}
	if _, ok := marketdata.SupportedTimeframes[tf]; !ok {
		WriteError(w, http.StatusBadRequest, "INVALID_TIMEFRAME", "timeframe must be one of 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 200
	}

	asset, err := h.market.GetAssetBySymbol(r.Context(), symbol)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	candles, err := h.market.ListCandles(r.Context(), asset.ID, tf, limit)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, candles, map[string]any{"symbol": symbol, "timeframe": tf, "count": len(candles)})
}

// GetIndicators GET /api/markets/:symbol/indicators?timeframe=4h
func (h *MarketHandler) GetIndicators(w http.ResponseWriter, r *http.Request) {
	symbol := strings.ToUpper(r.PathValue("symbol"))
	asset, err := h.market.GetAssetBySymbol(r.Context(), symbol)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	if tf := r.URL.Query().Get("timeframe"); tf != "" {
		ind, err := h.market.GetIndicator(r.Context(), asset.ID, tf)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		WriteOK(w, ind, map[string]any{"symbol": symbol})
		return
	}
	indicators, err := h.market.ListIndicators(r.Context(), asset.ID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, indicators, map[string]any{"symbol": symbol})
}

// Overview GET /api/market-overview
func (h *MarketHandler) Overview(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.market.LatestMetrics(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	sentiment, err := h.market.LatestSentiment(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{"metrics": metrics, "sentiment": sentiment}, nil)
}

// MarketCap GET /api/market-cap
func (h *MarketHandler) MarketCap(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.market.LatestMetrics(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	history, err := h.market.ListMarketCapHistory(r.Context(), 90)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{"current": metrics.TotalMarketCap, "change": metrics.MarketCapChange, "history": history}, nil)
}

// MarketVolume GET /api/market-volume
func (h *MarketHandler) MarketVolume(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.market.LatestMetrics(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	history, err := h.market.ListVolumeHistory(r.Context(), 90)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{"current": metrics.TotalVolume, "change": metrics.VolumeChange, "history": history}, nil)
}

// OpenInterest GET /api/open-interest
func (h *MarketHandler) OpenInterest(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.market.LatestMetrics(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	history, err := h.market.ListOpenInterestHistory(r.Context(), 90)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{"current": metrics.OpenInterest, "change": metrics.OpenInterestChange, "history": history}, nil)
}

// BitcoinDominance GET /api/bitcoin-dominance
func (h *MarketHandler) BitcoinDominance(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.market.LatestMetrics(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	history, err := h.market.ListDominance(r.Context(), 90)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{
		"current": map[string]any{"btc": metrics.BTCDominance, "eth": metrics.ETHDominance, "other": metrics.OtherDominance},
		"history": history,
	}, nil)
}

// Sentiment GET /api/sentiment
func (h *MarketHandler) Sentiment(w http.ResponseWriter, r *http.Request) {
	sentiment, err := h.market.LatestSentiment(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, sentiment, nil)
}

// FearGreed GET /api/fear-greed
func (h *MarketHandler) FearGreed(w http.ResponseWriter, r *http.Request) {
	current, err := h.market.LatestMetrics(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	history, err := h.market.ListFearGreed(r.Context(), 90)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{
		"current": map[string]any{"value": current.FearGreed, "label": current.FearGreedLabel},
		"history": history,
	}, nil)
}

// Heatmap GET /api/heatmap
func (h *MarketHandler) Heatmap(w http.ResponseWriter, r *http.Request) {
	listings, err := h.market.ListMarkets(r.Context())
	if err != nil {
		writeServiceError(w, err)
		return
	}
	cells := make([]map[string]any, 0, len(listings))
	for _, l := range listings {
		cells = append(cells, map[string]any{
			"symbol":    l.Symbol,
			"name":      l.Name,
			"sector":    l.Sector,
			"change24h": l.Change24h,
			"marketCap": l.MarketCap,
		})
	}
	WriteOK(w, cells, nil)
}
