package handlers

import (
	"net/http"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/models"
	"cryptolytic/backend/internal/repositories"
)

var validAlertConditions = map[string]bool{
	"price_above": true, "price_below": true,
	"rsi_above": true, "rsi_below": true,
	"ema_cross": true, "sentiment_change": true,
}

type AlertHandler struct {
	alerts *repositories.AlertRepo
}

func NewAlertHandler(alerts *repositories.AlertRepo) *AlertHandler {
	return &AlertHandler{alerts: alerts}
}

func (h *AlertHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.alerts.ListByUser(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, items, nil)
}

type createAlertRequest struct {
	Symbol    string `json:"symbol" validate:"required,uppercase"`
	Condition string `json:"condition" validate:"required"`
	Target    string `json:"target"`
}

func (h *AlertHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createAlertRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	if !validAlertConditions[req.Condition] {
		WriteError(w, http.StatusUnprocessableEntity, "INVALID_CONDITION", "condition must be one of price_above, price_below, rsi_above, rsi_below, ema_cross, sentiment_change")
		return
	}
	item, err := h.alerts.Create(r.Context(), &models.Alert{
		UserID:    middleware.UserID(r.Context()),
		Symbol:    req.Symbol,
		Condition: req.Condition,
		Target:    req.Target,
		Status:    "active",
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteCreated(w, item)
}

type updateAlertRequest struct {
	Symbol    string `json:"symbol"`
	Condition string `json:"condition"`
	Target    string `json:"target"`
	Status    string `json:"status"`
}

func (h *AlertHandler) Update(w http.ResponseWriter, r *http.Request) {
	existing, err := h.alerts.GetByID(r.Context(), r.PathValue("id"), middleware.UserID(r.Context()))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	var req updateAlertRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	if req.Symbol != "" {
		existing.Symbol = req.Symbol
	}
	if req.Condition != "" {
		if !validAlertConditions[req.Condition] {
			WriteError(w, http.StatusUnprocessableEntity, "INVALID_CONDITION", "condition must be one of price_above, price_below, rsi_above, rsi_below, ema_cross, sentiment_change")
			return
		}
		existing.Condition = req.Condition
	}
	if req.Target != "" {
		existing.Target = req.Target
	}
	if req.Status != "" {
		switch req.Status {
		case "active", "paused", "triggered", "expired":
			existing.Status = req.Status
		default:
			WriteError(w, http.StatusUnprocessableEntity, "INVALID_STATUS", "status must be active, paused, triggered or expired")
			return
		}
	}
	if err := h.alerts.Update(r.Context(), existing); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, existing, nil)
}

func (h *AlertHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.alerts.Delete(r.Context(), r.PathValue("id"), middleware.UserID(r.Context())); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}
