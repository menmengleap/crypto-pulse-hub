package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"cryptolytic/backend/internal/services"
)

// OAuthStart redirects the browser to the provider's authorize endpoint.
func (h *AuthHandler) OAuthStart(provider string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		state, err := h.auth.SignOAuthState(provider)
		if err != nil {
			writeServiceError(w, err)
			return
		}
		authorizeURL, err := h.auth.OAuthAuthorizeURL(provider, state)
		if err != nil {
			if errors.Is(err, services.ErrOAuthNotConfigured) {
				WriteError(w, http.StatusServiceUnavailable, "OAUTH_NOT_CONFIGURED",
					provider+" sign-in is not configured on this server")
				return
			}
			writeServiceError(w, err)
			return
		}
		http.Redirect(w, r, authorizeURL, http.StatusFound)
	}
}

// OAuthCallback exchanges the provider code and sends the browser back to the
// frontend with a fresh token pair in the query string.
func (h *AuthHandler) OAuthCallback(provider string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		fail := func() {
			dest := strings.TrimRight(h.cfg.FrontendURL, "/") + "/login?error=" +
				url.QueryEscape("Sign-in failed. Please try again.")
			http.Redirect(w, r, dest, http.StatusFound)
		}

		state := r.URL.Query().Get("state")
		code := r.URL.Query().Get("code")
		if err := h.auth.VerifyOAuthState(state, provider); err != nil || code == "" {
			fail()
			return
		}

		result, err := h.auth.OAuthCallback(r.Context(), provider, code, r.UserAgent(), clientIP(r))
		if err != nil {
			fail()
			return
		}

		dest := fmt.Sprintf(
			"%s/auth/callback?accessToken=%s&refreshToken=%s",
			strings.TrimRight(h.cfg.FrontendURL, "/"),
			url.QueryEscape(result.Tokens.AccessToken),
			url.QueryEscape(result.Tokens.RefreshToken),
		)
		http.Redirect(w, r, dest, http.StatusFound)
	}
}
