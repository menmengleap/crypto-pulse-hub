package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"cryptolytic/backend/internal/models"
	"cryptolytic/backend/internal/repositories"
)

// ErrInvalidAPIKey is returned when a raw key cannot be resolved.
var ErrInvalidAPIKey = errors.New("invalid api key")

// APIKeyPrefix is the human-friendly prefix of every generated key, so keys
// are recognisable in logs and dashboards (e.g. cl_live_x4...). We never log
// the full secret.
const APIKeyPrefix = "cl_live_"

// APIKeyService manages developer API keys: creation, revocation, resolution
// (for the developer-auth middleware) and usage aggregation.
type APIKeyService struct {
	keys *repositories.APIKeyRepo
}

func NewAPIKeyService(keys *repositories.APIKeyRepo) *APIKeyService {
	return &APIKeyService{keys: keys}
}

// APIKeySecret is the full key returned to the client (shown only once).
type APIKeySecret struct {
	models.APIKey
	Secret string `json:"secret"`
}

// Create generates a new key for the user and persists only its hash.
func (s *APIKeyService) Create(ctx context.Context, userID, name string) (*APIKeySecret, error) {
	secret, err := randomKeySecret()
	if err != nil {
		return nil, err
	}
	key := &models.APIKey{
		UserID:    userID,
		Name:      name,
		KeyHash:   hashAPIKey(secret),
		MaskedKey: maskAPIKey(secret),
		Status:    "active",
	}
	created, err := s.keys.Create(ctx, key)
	if err != nil {
		return nil, err
	}
	return &APIKeySecret{APIKey: *created, Secret: secret}, nil
}

// List returns the user's keys (masked, no secrets).
func (s *APIKeyService) List(ctx context.Context, userID string) ([]models.APIKey, error) {
	return s.keys.ListByUser(ctx, userID)
}

// Revoke invalidates one of the user's keys.
func (s *APIKeyService) Revoke(ctx context.Context, userID, id string) error {
	return s.keys.Revoke(ctx, id, userID)
}

// Resolve authenticates a raw API key, returning the owning user id and the
// key row. The key's last_used_at is stamped on every successful call.
func (s *APIKeyService) Resolve(ctx context.Context, raw string) (string, *models.APIKey, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil, ErrInvalidAPIKey
	}
	key, err := s.keys.GetByHash(ctx, hashAPIKey(raw))
	if err != nil {
		return "", nil, ErrInvalidAPIKey
	}
	if err := s.keys.TouchLastUsed(ctx, key.ID); err != nil {
		// A failed stamp must not break the request — usage is best-effort.
		_ = err
	}
	return key.UserID, key, nil
}

// Usage returns the user's aggregate usage over the requested range
// (e.g. "24h", "7d", "30d" — anything time.ParseDuration accepts).
func (s *APIKeyService) Usage(ctx context.Context, userID, rangeStr string) (*models.UsageStats, error) {
	d, err := parseRange(rangeStr)
	if err != nil {
		return nil, err
	}
	active, err := s.keys.CountActiveKeys(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.keys.UsageSince(ctx, userID, time.Now().UTC().Add(-d), active)
}

// RecordUsage logs one indicator API call for the user (key id optional).
func (s *APIKeyService) RecordUsage(ctx context.Context, userID string, keyID *string, indicatorTypes []string, status string, statusCode, latencyMs int) {
	usage := &models.APIKeyUsage{
		APIKeyID:      keyID,
		UserID:        userID,
		IndicatorType: strings.Join(indicatorTypes, ", "),
		Status:        status,
		StatusCode:    statusCode,
		LatencyMs:     latencyMs,
	}
	// Usage logging is best-effort — never fail a calculation because the log
	// insert failed.
	_ = s.keys.RecordUsage(ctx, usage)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func parseRange(rangeStr string) (time.Duration, error) {
	switch strings.ToLower(strings.TrimSpace(rangeStr)) {
	case "", "24h", "1d":
		return 24 * time.Hour, nil
	case "7d", "week":
		return 7 * 24 * time.Hour, nil
	case "30d", "month":
		return 30 * 24 * time.Hour, nil
	case "90d":
		return 90 * 24 * time.Hour, nil
	}
	if d, err := time.ParseDuration(rangeStr); err == nil && d > 0 {
		return d, nil
	}
	return 0, fmt.Errorf("invalid range %q (use e.g. 24h, 7d, 30d)", rangeStr)
}

// randomKeySecret builds a 43-char url-safe secret: prefix + 32 random bytes.
func randomKeySecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate api key: %w", err)
	}
	return APIKeyPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashAPIKey(secret string) string {
	sum := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(sum[:])
}

// maskAPIKey keeps the first and last chunks readable, hiding the middle:
// cl_live_Ab12Cd34…f9zA
func maskAPIKey(secret string) string {
	const keepHead, keepTail = 10, 4
	if len(secret) <= keepHead+keepTail+1 {
		return "…" + secret[len(secret)-keepTail:]
	}
	return secret[:keepHead] + "…" + secret[len(secret)-keepTail:]
}
