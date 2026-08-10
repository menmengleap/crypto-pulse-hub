package handlers

import (
	"errors"
	"net/http"

	"cryptolytic/backend/internal/services"
)

type IndicatorHandler struct {
	svc *services.IndicatorService
}

func NewIndicatorHandler(svc *services.IndicatorService) *IndicatorHandler {
	return &IndicatorHandler{svc: svc}
}

// Calculate POST /api/indicators/calculate
//
// Accepts OHLCV candles + indicator specs and forwards them to the Python
// technical indicator microservice. The response is returned verbatim.
//
// Graceful fallback: when the Python service is unreachable (cold start, rest,
// outage) the gateway answers 503 SERVICE_UNAVAILABLE with a human-readable
// message — the frontend then hides indicator overlays and the chart keeps
// working with candles alone. It never returns fabricated indicator data.
func (h *IndicatorHandler) Calculate(w http.ResponseWriter, r *http.Request) {
	var req services.IndicatorCalculateRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}

	resp, err := h.svc.Calculate(r.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidRequest):
			WriteError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		case errors.Is(err, services.ErrServiceUnavailable):
			WriteError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE",
				"The indicator service is temporarily unavailable — please try again in a moment.")
		default:
			writeServiceError(w, err)
		}
		return
	}
	WriteOK(w, resp, nil)
}
