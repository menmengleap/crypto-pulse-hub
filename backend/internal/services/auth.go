package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"cryptolytic/backend/internal/config"
	"cryptolytic/backend/internal/models"
	"cryptolytic/backend/internal/repositories"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrEmailTaken         = errors.New("email already registered")
	ErrUserInactive       = errors.New("user is inactive")
)

type AuthService struct {
	users    *repositories.UserRepo
	sessions *repositories.SessionRepo
	cfg      *config.Config
}

func NewAuthService(users *repositories.UserRepo, sessions *repositories.SessionRepo, cfg *config.Config) *AuthService {
	return &AuthService{users: users, sessions: sessions, cfg: cfg}
}

// Claims are the JWT claims for access tokens.
type Claims struct {
	SessionID string `json:"sid"`
	Type      string `json:"typ"` // "access" | "refresh"
	jwt.RegisteredClaims
}

// Tokens is the pair returned to clients.
type Tokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	TokenType    string `json:"tokenType"`
	ExpiresIn    int64  `json:"expiresIn"` // access token lifetime in seconds
}

type AuthResult struct {
	User   models.User `json:"user"`
	Tokens Tokens      `json:"tokens"`
}

// ---------------------------------------------------------------------------
// Registration & login
// ---------------------------------------------------------------------------

func (s *AuthService) Register(ctx context.Context, email, name, password string) (*AuthResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if err := validatePassword(password); err != nil {
		return nil, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &models.User{Email: email, Name: strings.TrimSpace(name), Password: string(hash)}
	user, err = s.users.Create(ctx, user)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}
	return s.issueSession(ctx, user, "")
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthResult, error) {
	user, err := s.users.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	return s.issueSession(ctx, user, "")
}

func (s *AuthService) issueSession(ctx context.Context, user *models.User, userAgent string) (*AuthResult, error) {
	refreshToken, err := randomToken(32)
	if err != nil {
		return nil, err
	}
	session := &models.Session{
		UserID:           user.ID,
		RefreshTokenHash: hashToken(refreshToken),
		UserAgent:        userAgent,
		ExpiresAt:        time.Now().UTC().Add(s.cfg.JWTRefreshTTL),
	}
	if err := s.sessions.Create(ctx, session); err != nil {
		return nil, err
	}

	accessToken, expiresIn, err := s.issueAccessToken(user.ID, session.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResult{
		User: *user,
		Tokens: Tokens{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			TokenType:    "Bearer",
			ExpiresIn:    int64(expiresIn.Seconds()),
		},
	}, nil
}

// ---------------------------------------------------------------------------
// Refresh & logout
// ---------------------------------------------------------------------------

// Refresh rotates the session: the old refresh token is revoked and a new
// session (with a fresh refresh token and a new access token) is issued.
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*AuthResult, error) {
	if refreshToken == "" {
		return nil, ErrInvalidToken
	}
	session, err := s.sessions.GetByRefreshHash(ctx, hashToken(refreshToken))
	if err != nil {
		return nil, ErrInvalidToken
	}
	user, err := s.users.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, ErrInvalidToken
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}
	_ = s.sessions.Revoke(ctx, session.ID)
	return s.issueSession(ctx, user, session.UserAgent)
}

// Logout revokes the session identified by an access token or refresh token.
func (s *AuthService) Logout(ctx context.Context, accessToken, refreshToken string) error {
	if refreshToken != "" {
		session, err := s.sessions.GetByRefreshHash(ctx, hashToken(refreshToken))
		if err == nil {
			return s.sessions.Revoke(ctx, session.ID)
		}
	}
	if accessToken != "" {
		claims, err := s.ParseAccessToken(accessToken)
		if err == nil && claims.SessionID != "" {
			return s.sessions.Revoke(ctx, claims.SessionID)
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

// ForgotPassword creates a reset token. In development the plain token is
// returned so flows can be tested without an email provider; production
// deployments should send it via email instead.
func (s *AuthService) ForgotPassword(ctx context.Context, email string) (string, error) {
	user, err := s.users.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		// Do not leak whether the email exists.
		return "", nil
	}
	token, err := randomToken(32)
	if err != nil {
		return "", err
	}
	err = s.users.SetResetToken(ctx, user.ID, hashToken(token), time.Now().UTC().Add(time.Hour))
	if err != nil {
		return "", fmt.Errorf("store reset token: %w", err)
	}
	return token, nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if err := validatePassword(newPassword); err != nil {
		return err
	}
	user, err := s.users.UserByResetToken(ctx, hashToken(token))
	if err != nil {
		return ErrInvalidToken
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	if err := s.users.UpdatePassword(ctx, user.ID, string(hash)); err != nil {
		return err
	}
	if err := s.users.ClearResetToken(ctx, user.ID); err != nil {
		return err
	}
	return s.sessions.RevokeAllForUser(ctx, user.ID)
}

// ---------------------------------------------------------------------------
// Profile & preferences
// ---------------------------------------------------------------------------

func (s *AuthService) Me(ctx context.Context, userID string) (map[string]any, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	profile, err := s.users.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	prefs, err := s.users.GetPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"user": user, "profile": profile, "preferences": prefs}, nil
}

func (s *AuthService) UpdateMe(ctx context.Context, userID, name, email string) (*models.User, error) {
	if err := s.users.Update(ctx, userID, name, email); err != nil {
		return nil, err
	}
	return s.users.GetByID(ctx, userID)
}

func (s *AuthService) UpdatePreferences(ctx context.Context, prefs *models.UserPreference) error {
	return s.users.UpdatePreferences(ctx, prefs)
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

func (s *AuthService) issueAccessToken(userID, sessionID string) (string, time.Duration, error) {
	now := time.Now().UTC()
	claims := Claims{
		SessionID: sessionID,
		Type:      "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.JWTAccessTTL)),
			Issuer:    "cryptolytic-api",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", 0, fmt.Errorf("sign access token: %w", err)
	}
	return signed, s.cfg.JWTAccessTTL, nil
}

// ParseAccessToken validates a JWT and returns its claims.
func (s *AuthService) ParseAccessToken(raw string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	}, jwt.WithIssuer("cryptolytic-api"))
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	if claims.Type != "access" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func randomToken(nBytes int) (string, error) {
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func validatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	if strings.ToLower(password) == password || strings.ToUpper(password) == password {
		return errors.New("password must contain mixed case")
	}
	if !strings.ContainsAny(password, "0123456789") {
		return errors.New("password must contain a number")
	}
	return nil
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "duplicate key")
}
