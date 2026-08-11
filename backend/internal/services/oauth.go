package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"cryptolytic/backend/internal/models"
)

// OAuth providers.
const (
	ProviderGoogle = "google"
	ProviderGitHub = "github"
)

const (
	googleAuthURL      = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenURL     = "https://oauth2.googleapis.com/token"
	googleUserInfoURL  = "https://www.googleapis.com/oauth2/v2/userinfo"
	githubAuthURL      = "https://github.com/login/oauth/authorize"
	githubTokenURL     = "https://github.com/login/oauth/access_token"
	githubUserURL      = "https://api.github.com/user"
	githubEmailsURL    = "https://api.github.com/user/emails"
	oauthStateLifetime = 10 * time.Minute
)

// OAuthProfile is the normalized identity returned by a provider.
type OAuthProfile struct {
	Provider   string
	ProviderID string
	Email      string
	Name       string
	AvatarURL  string
}

var ErrOAuthNotConfigured = errors.New("oauth provider is not configured")

// OAuthAuthorizeURL builds the provider authorize URL for the given state.
func (s *AuthService) OAuthAuthorizeURL(provider, state string) (string, error) {
	redirect := s.oauthRedirectURL(provider)
	params := url.Values{
		"client_id":    {s.oauthClientID(provider)},
		"redirect_uri": {redirect},
		"state":        {state},
	}
	switch provider {
	case ProviderGoogle:
		if s.cfg.GoogleClientID == "" {
			return "", ErrOAuthNotConfigured
		}
		params.Set("response_type", "code")
		params.Set("scope", "openid email profile")
		params.Set("prompt", "select_account")
		return googleAuthURL + "?" + params.Encode(), nil
	case ProviderGitHub:
		if s.cfg.GitHubClientID == "" {
			return "", ErrOAuthNotConfigured
		}
		params.Set("scope", "read:user user:email")
		return githubAuthURL + "?" + params.Encode(), nil
	default:
		return "", fmt.Errorf("unsupported oauth provider %q", provider)
	}
}

// OAuthCallback exchanges an authorization code for a user session.
func (s *AuthService) OAuthCallback(ctx context.Context, provider, code, userAgent, ip string) (*AuthResult, error) {
	var info OAuthProfile
	var err error
	switch provider {
	case ProviderGoogle:
		info, err = s.googleUser(ctx, code)
	case ProviderGitHub:
		info, err = s.githubUser(ctx, code)
	default:
		return nil, fmt.Errorf("unsupported oauth provider %q", provider)
	}
	if err != nil {
		return nil, err
	}

	user, err := s.findOrCreateOAuthUser(ctx, info)
	if err != nil {
		return nil, err
	}
	return s.issueSession(ctx, user, userAgent, ip)
}

// SignOAuthState returns an HMAC-signed state value bound to the provider.
func (s *AuthService) SignOAuthState(provider string) (string, error) {
	nonce, err := randomToken(16)
	if err != nil {
		return "", err
	}
	payload := provider + ":" + nonce + ":" + strconv.FormatInt(time.Now().UTC().Unix(), 10)
	mac := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}

// VerifyOAuthState checks the signature, provider binding and expiry.
func (s *AuthService) VerifyOAuthState(state, provider string) error {
	parts := strings.SplitN(state, ".", 2)
	if len(parts) != 2 {
		return ErrInvalidToken
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return ErrInvalidToken
	}
	mac := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	_, _ = mac.Write(payload)
	if !hmac.Equal([]byte(parts[1]), []byte(base64.RawURLEncoding.EncodeToString(mac.Sum(nil)))) {
		return ErrInvalidToken
	}

	fields := strings.SplitN(string(payload), ":", 3)
	if len(fields) != 3 || fields[0] != provider {
		return ErrInvalidToken
	}
	issued, err := strconv.ParseInt(fields[2], 10, 64)
	if err != nil {
		return ErrInvalidToken
	}
	if time.Since(time.Unix(issued, 0)) > oauthStateLifetime {
		return ErrInvalidToken
	}
	return nil
}

// ---------------------------------------------------------------------------
// Provider exchanges
// ---------------------------------------------------------------------------

func (s *AuthService) oauthClientID(provider string) string {
	switch provider {
	case ProviderGoogle:
		return s.cfg.GoogleClientID
	case ProviderGitHub:
		return s.cfg.GitHubClientID
	}
	return ""
}

func (s *AuthService) oauthClientSecret(provider string) string {
	switch provider {
	case ProviderGoogle:
		return s.cfg.GoogleClientSecret
	case ProviderGitHub:
		return s.cfg.GitHubClientSecret
	}
	return ""
}

// oauthRedirectURL is where the provider sends the browser back. The browser
// reaches it through the frontend origin (which proxies /api to this backend),
// so the value registered in the provider console must match FRONTEND_URL.
func (s *AuthService) oauthRedirectURL(provider string) string {
	return strings.TrimRight(s.cfg.FrontendURL, "/") + "/api/auth/" + provider + "/callback"
}

// exchangeToken performs the OAuth token request and parses the JSON response.
func (s *AuthService) exchangeToken(ctx context.Context, provider, code string) (map[string]any, error) {
	form := url.Values{
		"client_id":     {s.oauthClientID(provider)},
		"client_secret": {s.oauthClientSecret(provider)},
		"code":          {code},
		"grant_type":    {"authorization_code"},
	}
	if provider == ProviderGoogle {
		form.Set("redirect_uri", s.oauthRedirectURL(provider))
	}

	tokenURL := googleTokenURL
	accept := "application/json"
	if provider == ProviderGitHub {
		tokenURL = githubTokenURL
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("oauth token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", accept)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("oauth token exchange: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("oauth token read: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("oauth token error: %s: %s", resp.Status, truncate(string(body), 200))
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("oauth token decode: %w", err)
	}
	return payload, nil
}

// getJSON performs an authenticated GET and decodes the JSON response.
func getJSON(ctx context.Context, url, token string, accept string, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("oauth userinfo: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("oauth userinfo error: %s: %s", resp.Status, truncate(string(body), 200))
	}
	return json.Unmarshal(body, dst)
}

func (s *AuthService) googleUser(ctx context.Context, code string) (OAuthProfile, error) {
	tok, err := s.exchangeToken(ctx, ProviderGoogle, code)
	if err != nil {
		return OAuthProfile{}, err
	}
	access, _ := tok["access_token"].(string)
	if access == "" {
		return OAuthProfile{}, errors.New("oauth: missing access token")
	}

	var info struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := getJSON(ctx, googleUserInfoURL, access, "", &info); err != nil {
		return OAuthProfile{}, err
	}
	email := strings.ToLower(strings.TrimSpace(info.Email))
	if info.ID == "" || email == "" {
		return OAuthProfile{}, errors.New("oauth: google profile missing id or email")
	}
	return OAuthProfile{
		Provider:   ProviderGoogle,
		ProviderID: info.ID,
		Email:      email,
		Name:       strings.TrimSpace(info.Name),
		AvatarURL:  info.Picture,
	}, nil
}

func (s *AuthService) githubUser(ctx context.Context, code string) (OAuthProfile, error) {
	tok, err := s.exchangeToken(ctx, ProviderGitHub, code)
	if err != nil {
		return OAuthProfile{}, err
	}
	access, _ := tok["access_token"].(string)
	if access == "" {
		return OAuthProfile{}, errors.New("oauth: missing access token")
	}

	var info struct {
		ID        int    `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	accept := "application/vnd.github+json"
	if err := getJSON(ctx, githubUserURL, access, accept, &info); err != nil {
		return OAuthProfile{}, err
	}
	if info.ID == 0 {
		return OAuthProfile{}, errors.New("oauth: github profile missing id")
	}

	email := strings.ToLower(strings.TrimSpace(info.Email))
	if email == "" {
		// Email may be private; ask the /user/emails endpoint for the primary.
		var emails []struct {
			Email    string `json:"email"`
			Primary  bool   `json:"primary"`
			Verified bool   `json:"verified"`
		}
		if err := getJSON(ctx, githubEmailsURL, access, accept, &emails); err == nil {
			for _, e := range emails {
				if e.Primary && e.Verified && e.Email != "" {
					email = strings.ToLower(strings.TrimSpace(e.Email))
					break
				}
			}
		}
	}
	if email == "" {
		// Fall back to a deterministic placeholder so the user still has a row.
		email = fmt.Sprintf("github-%d@users.local", info.ID)
	}

	name := strings.TrimSpace(info.Name)
	if name == "" {
		name = strings.TrimSpace(info.Login)
	}
	return OAuthProfile{
		Provider:   ProviderGitHub,
		ProviderID: strconv.Itoa(info.ID),
		Email:      email,
		Name:       name,
		AvatarURL:  info.AvatarURL,
	}, nil
}

// findOrCreateOAuthUser links an existing email user when possible, otherwise
// creates a new OAuth-only account.
func (s *AuthService) findOrCreateOAuthUser(ctx context.Context, info OAuthProfile) (*models.User, error) {
	if u, err := s.users.GetByOAuth(ctx, info.Provider, info.ProviderID); err == nil {
		return u, nil
	}

	// Account linking: an existing user with the same email becomes the OAuth user.
	if existing, err := s.users.GetByEmail(ctx, info.Email); err == nil {
		if err := s.users.LinkOAuth(ctx, existing.ID, info.Provider, info.ProviderID, info.AvatarURL); err != nil {
			return nil, err
		}
		return s.users.GetByID(ctx, existing.ID)
	}

	user := &models.User{Email: info.Email, Name: info.Name}
	return s.users.CreateOAuth(ctx, user, info.Provider, info.ProviderID, info.AvatarURL)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
