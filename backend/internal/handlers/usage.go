package handlers

import (
	"net/http"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/services"
)

// UsageHandler exposes GET /api/v1/usage — the authenticated user's aggregate
// request stats (totals + per-day series) for the dashboard.
type UsageHandler struct {
	svc *services.APIKeyService
}

func NewUsageHandler(svc *services.APIKeyService) *UsageHandler {
	return &UsageHandler{svc: svc}
}

// Get GET /api/v1/usage?range=7d
//
// range accepts "24h" (default), "7d", "30d", "90d" or any Go duration.
// The response is the raw UsageStats object (no envelope) to match the console
// API client: { totalRequests, successfulRequests, failedRequests,
// avgLatencyMs, activeKeys, series }.
func (h *UsageHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	stats, err := h.svc.Usage(r.Context(), userID, r.URL.Query().Get("range"))
	if err != nil {
		writeDeveloperError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, stats)
}
