package handlers

import (
	"errors"
	"net/http"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/repositories"
	"cryptolytic/backend/internal/services"
)

type AIHandler struct {
	ai *services.AIService
}

func NewAIHandler(ai *services.AIService) *AIHandler {
	return &AIHandler{ai: ai}
}

// Analyze POST /api/ai/analyze
func (h *AIHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	var req services.AnalyzeRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	analysis, err := h.ai.Analyze(r.Context(), middleware.UserID(r.Context()), req)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteCreated(w, analysis)
}

// List GET /api/ai/analyses
func (h *AIHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.ai.ListByUser(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, items, nil)
}

// Get GET /api/ai/analyses/:id
func (h *AIHandler) Get(w http.ResponseWriter, r *http.Request) {
	item, err := h.ai.GetByID(r.Context(), r.PathValue("id"), middleware.UserID(r.Context()))
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
			WriteError(w, http.StatusNotFound, "NOT_FOUND", "analysis not found")
			return
		}
		writeServiceError(w, err)
		return
	}
	WriteOK(w, item, nil)
}
