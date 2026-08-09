package handlers

import (
	"net/http"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/models"
	"cryptolytic/backend/internal/repositories"
)

type AnalysisHandler struct {
	analyses *repositories.AnalysisRepo
}

func NewAnalysisHandler(analyses *repositories.AnalysisRepo) *AnalysisHandler {
	return &AnalysisHandler{analyses: analyses}
}

func (h *AnalysisHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.analyses.ListByUser(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, items, nil)
}

type createAnalysisRequest struct {
	Title     string `json:"title" validate:"required,max=200"`
	Symbol    string `json:"symbol" validate:"required,uppercase"`
	Timeframe string `json:"timeframe" validate:"required,oneof=1m 5m 15m 30m 1h 4h 1d 1w"`
	Notes     string `json:"notes"`
	Tag       string `json:"tag"`
}

func (h *AnalysisHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createAnalysisRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	item, err := h.analyses.Create(r.Context(), &models.SavedAnalysis{
		UserID:    middleware.UserID(r.Context()),
		Title:     req.Title,
		Symbol:    req.Symbol,
		Timeframe: req.Timeframe,
		Notes:     req.Notes,
		Tag:       req.Tag,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteCreated(w, item)
}

func (h *AnalysisHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.analyses.GetByID(r.Context(), r.PathValue("id"), middleware.UserID(r.Context()))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, item, nil)
}

func (h *AnalysisHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.analyses.Delete(r.Context(), r.PathValue("id"), middleware.UserID(r.Context())); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteJSON(w, http.StatusNoContent, nil)
}
