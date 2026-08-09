package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"cryptolytic/backend/internal/services"
)

type ctxKey string

const userIDKey ctxKey = "userID"

// writeError emits the standard API error envelope without importing handlers
// (avoids an import cycle).
func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": false,
		"error":   map[string]any{"code": code, "message": message},
	})
}

// UserID extracts the authenticated user id from the request context.
func UserID(ctx context.Context) string {
	if v, ok := ctx.Value(userIDKey).(string); ok {
		return v
	}
	return ""
}

// RequireAuth protects routes by validating the Bearer access token.
func RequireAuth(auth *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing bearer token")
				return
			}
			claims, err := auth.ParseAccessToken(strings.TrimPrefix(header, "Bearer "))
			if err != nil {
				writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid or expired token")
				return
			}
			if claims.Subject == "" {
				writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token subject")
				return
			}
			ctx := context.WithValue(r.Context(), userIDKey, claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
