package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration. No secrets are hardcoded; everything
// comes from environment variables (optionally loaded from a local .env file).
type Config struct {
	Port           string
	AppEnv         string
	DatabaseURL    string
	JWTSecret      string
	JWTAccessTTL   time.Duration
	JWTRefreshTTL  time.Duration
	CORSOrigins    []string
	RateLimitRPS   float64
	RateLimitBurst int
	SeedOnStartup  bool
	WSEnabled      bool

	// OAuth (optional — Google / GitHub sign-in). When a client id is missing
	// the provider's /start endpoint returns 503 instead of redirecting.
	GoogleClientID     string
	GoogleClientSecret string
	GitHubClientID     string
	GitHubClientSecret string
	FrontendURL        string
}

// Load reads configuration from the environment. A local .env file is loaded
// when present (development convenience); it never overrides real env vars.
func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		AppEnv:         getEnv("APP_ENV", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		JWTAccessTTL:   getDurationEnv("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL:  getDurationEnv("JWT_REFRESH_TTL", 720*time.Hour),
		CORSOrigins:    splitCSV(getEnv("CORS_ORIGINS", "http://localhost:3001,http://localhost:5173")),
		RateLimitRPS:   getFloatEnv("RATE_LIMIT_RPS", 20),
		RateLimitBurst: getIntEnv("RATE_LIMIT_BURST", 40),
		SeedOnStartup:  getBoolEnv("SEED_ON_STARTUP", true),
		WSEnabled:      getBoolEnv("WS_ENABLED", true),

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:8080"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required (see .env.example)")
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required (see .env.example)")
	}
	if cfg.AppEnv == "production" && len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 characters in production")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getBoolEnv(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func getIntEnv(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getFloatEnv(key string, fallback float64) float64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fallback
	}
	return f
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
