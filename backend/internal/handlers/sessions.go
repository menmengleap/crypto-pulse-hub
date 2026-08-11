package handlers

import (
	"net"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/services"
)

// SessionHandler exposes the signed-in user's device sessions (the "logged-in
// devices" list in Settings) and lets them revoke individual sessions.
type SessionHandler struct {
	auth *services.AuthService
}

func NewSessionHandler(auth *services.AuthService) *SessionHandler {
	return &SessionHandler{auth: auth}
}

// clientIP extracts the client IP, honoring the first X-Forwarded-For entry
// (Render's edge) and falling back to the direct RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			xff = xff[:i]
		}
		return strings.TrimSpace(xff)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// List returns the active sessions for the authenticated user, newest first.
func (h *SessionHandler) List(w http.ResponseWriter, r *http.Request) {
	data, err := h.auth.ListSessions(r.Context(), middleware.UserID(r.Context()), h.currentSessionID(r))
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, data, nil)
}

// Revoke signs out a single session (scoped to the current user).
func (h *SessionHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	if err := h.auth.RevokeSession(r.Context(), middleware.UserID(r.Context()), chi.URLParam(r, "id")); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]bool{"revoked": true}, nil)
}

// RevokeOthers signs out every other device, keeping the current one.
func (h *SessionHandler) RevokeOthers(w http.ResponseWriter, r *http.Request) {
	if err := h.auth.RevokeOtherSessions(r.Context(), middleware.UserID(r.Context()), h.currentSessionID(r)); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]bool{"revoked": true}, nil)
}

// currentSessionID extracts the sid claim from the bearer access token so the
// session that issued the request can be flagged as the current device.
func (h *SessionHandler) currentSessionID(r *http.Request) string {
	claims, err := h.auth.ParseAccessToken(bearerToken(r))
	if err != nil {
		return ""
	}
	return claims.SessionID
}
