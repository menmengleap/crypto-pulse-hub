package handlers

import (
	"errors"
	"net/http"
	"strings"

	"cryptolytic/backend/internal/config"
	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/models"
	"cryptolytic/backend/internal/services"
)

type AuthHandler struct {
	auth *services.AuthService
	cfg  *config.Config
}

func NewAuthHandler(auth *services.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{auth: auth, cfg: cfg}
}

type registerRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

type logoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type forgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type resetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"newPassword" validate:"required,min=8"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	result, err := h.auth.Register(r.Context(), req.Email, req.Name, req.Password, r.UserAgent(), clientIP(r))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEmailTaken):
			WriteError(w, http.StatusConflict, "EMAIL_TAKEN", "an account with this email already exists")
		default:
			writeServiceError(w, err)
		}
		return
	}
	WriteCreated(w, result)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	result, err := h.auth.Login(r.Context(), req.Email, req.Password, r.UserAgent(), clientIP(r))
	if err != nil {
		WriteError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
		return
	}
	WriteOK(w, result, nil)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	result, err := h.auth.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		WriteError(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "refresh token is invalid or expired")
		return
	}
	WriteOK(w, result, nil)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req logoutRequest
	_ = DecodeJSON(r, &req)
	access := bearerToken(r)
	if err := h.auth.Logout(r.Context(), access, req.RefreshToken); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, map[string]bool{"loggedOut": true}, nil)
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	token, err := h.auth.ForgotPassword(r.Context(), req.Email)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	data := map[string]any{"message": "If that email exists, a reset link has been issued."}
	// In development the token is returned so the flow is testable end to end.
	if token != "" && h.cfg.AppEnv != "production" {
		data["resetToken"] = token
	}
	WriteOK(w, data, nil)
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	if err := h.auth.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidToken):
			WriteError(w, http.StatusBadRequest, "INVALID_RESET_TOKEN", "reset token is invalid or expired")
		default:
			writeServiceError(w, err)
		}
		return
	}
	WriteOK(w, map[string]bool{"passwordReset": true}, nil)
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

type UserHandler struct {
	auth *services.AuthService
}

func NewUserHandler(auth *services.AuthService) *UserHandler {
	return &UserHandler{auth: auth}
}

func (h *UserHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	data, err := h.auth.Me(r.Context(), userID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, data, nil)
}

type updateMeRequest struct {
	Name  string `json:"name"`
	Email string `json:"email" validate:"omitempty,email"`
}

func (h *UserHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	var req updateMeRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	user, err := h.auth.UpdateMe(r.Context(), middleware.UserID(r.Context()), req.Name, req.Email)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, user, nil)
}

type updateProfileRequest struct {
	DisplayName string `json:"displayName" validate:"max=120"`
	Bio         string `json:"bio" validate:"max=1000"`
	// AvatarURL is a client-resized image data URL (data:image/...;base64,...)
	// or an external https URL (e.g. an OAuth provider avatar).
	AvatarURL string `json:"avatarUrl" validate:"max=2000000"`
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	var req updateProfileRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}

	// Reject a fully-empty payload so a buggy client can't wipe the profile.
	if req.DisplayName == "" && req.Bio == "" && req.AvatarURL == "" {
		WriteError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "nothing to update")
		return
	}
	// Only accept image data URLs or https avatars (never javascript:, data:html, etc).
	if u := req.AvatarURL; u != "" && !strings.HasPrefix(u, "data:image/") && !strings.HasPrefix(u, "https://") {
		WriteError(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "avatarUrl must be an image or https URL")
		return
	}

	profile, err := h.auth.UpdateProfile(r.Context(), middleware.UserID(r.Context()), req.DisplayName, req.Bio, req.AvatarURL)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, profile, nil)
}

type preferencesRequest struct {
	DefaultCurrency  string            `json:"defaultCurrency"`
	DefaultTimeframe string            `json:"defaultTimeframe"`
	Theme            string            `json:"theme"`
	Notifications    map[string]bool   `json:"notifications"`
	ChartPreferences map[string]string `json:"chartPreferences"`
}

func (h *UserHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	var req preferencesRequest
	if err := DecodeJSON(r, &req); err != nil {
		writeBadRequest(w, err)
		return
	}
	prefs := &models.UserPreference{
		UserID:           middleware.UserID(r.Context()),
		DefaultCurrency:  req.DefaultCurrency,
		DefaultTimeframe: req.DefaultTimeframe,
		Theme:            req.Theme,
		Notifications:    req.Notifications,
		ChartPreferences: req.ChartPreferences,
	}
	if err := h.auth.UpdatePreferences(r.Context(), prefs); err != nil {
		writeServiceError(w, err)
		return
	}
	WriteOK(w, prefs, nil)
}
