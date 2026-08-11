package handlers

import (
	"errors"
	"net/http"
	"time"

	"cryptolytic/backend/internal/indicators"
	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/services"
)

// IndicatorHandler serves the indicator API surface: the legacy public
// calculate proxy plus the developer v1 routes (catalog, status, calculate).
type IndicatorHandler struct {
	svc   *services.IndicatorService
	usage *services.APIKeyService // optional — logs developer API usage
}

func NewIndicatorHandler(svc *services.IndicatorService, usage *services.APIKeyService) *IndicatorHandler {
	return &IndicatorHandler{svc: svc, usage: usage}
}

// Calculate POST /api/indicators/calculate (legacy, public)
//
// Accepts OHLCV candles + indicator specs and forwards them to the Python
// technical indicator microservice. The response is returned verbatim inside
// the standard envelope.
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

// List GET /api/v1/indicators (public)
//
// Serves the indicator catalog — the same 8 indicators the Python microservice
// implements, with params, lines, formulas and warm-up notes. This is the
// machine-readable source the marketing/indicators pages and docs are built on.
func (h *IndicatorHandler) List(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, indicators.List())
}

// Status GET /api/v1/status (public)
//
// Liveness + service metadata for the developer API surface.
func (h *IndicatorHandler) Status(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"status":     "ok",
		"service":    "cryptolytic-indicator-api",
		"version":    "1.0.0",
		"timeframes": indicators.Timeframes,
		"time":       time.Now().UTC().Format(time.RFC3339),
	})
}

// CalculateV1 POST /api/v1/indicators/calculate (developer)
//
// Same engine as the legacy route but protected by RequireDeveloperAuth (a
// platform JWT or a dashboard API key) and logged to api_key_usage so the
// dashboard can show per-key request counts, success rate and latency.
//
// Unlike the legacy route, the body is the raw indicator response (identical
// to what the Python service returns) — the console API client expects it
// unwrapped.
func (h *IndicatorHandler) CalculateV1(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())

	var req services.IndicatorCalculateRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}

	started := time.Now()
	resp, err := h.svc.Calculate(r.Context(), &req)
	latencyMs := int(time.Since(started).Milliseconds())

	if err != nil {
		// Resolve the real status first so the usage log records what the
		// client actually received (400 validation vs 503 service down).
		status, code, message := http.StatusInternalServerError, "INTERNAL_ERROR", "something went wrong"
		switch {
		case errors.Is(err, services.ErrInvalidRequest):
			status, code, message = http.StatusBadRequest, "VALIDATION_ERROR", err.Error()
		case errors.Is(err, services.ErrServiceUnavailable):
			status, code, message = http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE",
				"The indicator service is temporarily unavailable — please try again in a moment."
		}
		h.logUsage(r, userID, req, "error", status, latencyMs)
		writeDeveloperError(w, status, code, message)
		return
	}

	h.logUsage(r, userID, req, "ok", http.StatusOK, latencyMs)
	WriteJSON(w, http.StatusOK, resp)
}

// logUsage records one developer API call (best-effort — never fails the
// request when the usage insert fails).
func (h *IndicatorHandler) logUsage(r *http.Request, userID string, req services.IndicatorCalculateRequest, status string, statusCode, latencyMs int) {
	if h.usage == nil {
		return
	}
	var keyID *string
	if kid := middleware.APIKeyID(r.Context()); kid != "" {
		keyID = &kid
	}
	types := make([]string, 0, len(req.Indicators))
	for _, spec := range req.Indicators {
		types = append(types, spec.Type)
	}
	h.usage.RecordUsage(r.Context(), userID, keyID, types, status, statusCode, latencyMs)
}

