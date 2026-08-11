package middleware

import (
	"context"
	"net/http"
	"strings"

	"cryptolytic/backend/internal/services"
)

const apiKeyIDKey ctxKey = "apiKeyID"

// APIKeyID extracts the authenticated developer API key id from the request
// context (empty when the request was authenticated with a JWT instead).
func APIKeyID(ctx context.Context) string {
	if v, ok := ctx.Value(apiKeyIDKey).(string); ok {
		return v
	}
	return ""
}

// RequireDeveloperAuth protects the developer API (v1) surface. It accepts
// either a platform access token (JWT — the browser console signs in this way)
// or a developer API key issued from the dashboard. Whichever is used, the
// owning user id lands in the context; when an API key was used, its id is
// attached too so usage can be logged per key.
func RequireDeveloperAuth(auth *services.AuthService, keys *services.APIKeyService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing bearer token")
				return
			}
			raw := strings.TrimPrefix(header, "Bearer ")

			// 1) Platform JWT — the signed-in console.
			if claims, err := auth.ParseAccessToken(raw); err == nil && claims.Subject != "" {
				ctx := context.WithValue(r.Context(), userIDKey, claims.Subject)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// 2) Developer API key — issued from the dashboard.
			if userID, key, err := keys.Resolve(r.Context(), raw); err == nil && key != nil {
				ctx := context.WithValue(r.Context(), userIDKey, userID)
				ctx = context.WithValue(ctx, apiKeyIDKey, key.ID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid or revoked credential")
		})
	}
}
