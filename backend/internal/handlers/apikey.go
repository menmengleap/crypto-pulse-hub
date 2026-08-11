package handlers

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/services"
)

// APIKeyHandler exposes the developer API-key CRUD surface
// (GET/POST /api/v1/api-keys, DELETE /api/v1/api-keys/{id}).
type APIKeyHandler struct {
	svc *services.APIKeyService
}

func NewAPIKeyHandler(svc *services.APIKeyService) *APIKeyHandler {
	return &APIKeyHandler{svc: svc}
}

// List GET /api/v1/api-keys
//
// Returns the authenticated user's keys (masked — secrets are never persisted,
// so they can never be returned). Response: { success, data: { keys: [...] } }.
func (h *APIKeyHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	keys, err := h.svc.List(r.Context(), userID)
	if err != nil {
		writeDeveloperServiceError(w, err)
		return
	}
	WriteOK(w, map[string]any{"keys": keys}, nil)
}

type createAPIKeyRequest struct {
	Name string `json:"name" validate:"required,max=120"`
}

// Create POST /api/v1/api-keys
//
// Generates a new key. The full secret is returned exactly once in data.secret
// (never stored, only its SHA-256 hash).
func (h *APIKeyHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createAPIKeyRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeDeveloperError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR",
			"request failed validation — name is required (max 120 chars)")
		return
	}
	userID := middleware.UserID(r.Context())
	key, err := h.svc.Create(r.Context(), userID, strings.TrimSpace(req.Name))
	if err != nil {
		writeDeveloperServiceError(w, err)
		return
	}
	WriteCreated(w, key)
}

// Revoke DELETE /api/v1/api-keys/{id}
//
// Marks the key revoked so it stops authenticating requests. Keys belonging to
// another user are treated as not found.
func (h *APIKeyHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	if err := h.svc.Revoke(r.Context(), userID, chi.URLParam(r, "id")); err != nil {
		writeDeveloperServiceError(w, err)
		return
	}
	WriteOK(w, map[string]bool{"revoked": true}, nil)
}
