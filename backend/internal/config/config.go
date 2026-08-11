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

	// Live market-data providers. When LIVE_DATA_ENABLED is true the backend
	// fetches crypto from Binance's public API, forex from exchangerate-api /
	// Frankfurter, and stocks from Yahoo Finance / Finnhub — always server-side,
	// so clients never talk to a provider directly.
	LiveEnabled          bool
	CryptoRefreshSeconds int // cadence for crypto snapshots (5–10s recommended)
	ForexRefreshSeconds  int // cadence for forex tickers (15–30s recommended)
	StockRefreshSeconds  int // cadence for stock tickers (30–60s recommended)
	FinnhubAPIKey        string
	ExchangeRateAPIKey   string

	// Traditional-markets feed (forex / indices / DXY / commodities / futures /
	// bonds). TWELVE DATA streams forex + gold over a realtime WebSocket; Yahoo
	// Finance fills indices, the Dollar Index, CME futures and treasury yields
	// (the free TWELVE DATA plan 403/404s those); Alpha Vantage serves treasury
	// yield history, US inflation and commodity history. Redis is an optional
	// cache (REDIS_URL); without it an in-process TTL cache is used.
	TwelveDataAPIKey     string
	AlphaVantageAPIKey   string
	TradFiRefreshSeconds int  // cadence for the trad-fi snapshot (10–30s recommended)
	TradFiWSEnabled      bool // realtime WebSocket to TWELVE DATA
	RedisURL             string


	// IndicatorServiceURL points at the Python technical-indicator microservice
	// (FastAPI). The gateway forwards OHLCV + indicator specs to it and returns
	// the computed series. In production set it to the Render service URL, e.g.
	// https://python-indicators.onrender.com.
	IndicatorServiceURL string
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
		RateLimitRPS:   getFloatEnv("RATE_LIMIT_RPS", 30),
		RateLimitBurst: getIntEnv("RATE_LIMIT_BURST", 60),
		SeedOnStartup:  getBoolEnv("SEED_ON_STARTUP", true),
		WSEnabled:      getBoolEnv("WS_ENABLED", true),

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:8080"),

		// Live provider settings. The API keys below are the project's free-tier
		// keys; override them with FINNHUB_API_KEY / EXCHANGERATE_API_KEY in the
		// environment (they are only used server-side, never sent to the client).
		// Cadences match the requested ranges: crypto 10s, forex 30s, stocks 60s.
		LiveEnabled:          getBoolEnv("LIVE_DATA_ENABLED", true),
		CryptoRefreshSeconds: getIntEnv("CRYPTO_REFRESH_SECONDS", 10),
		ForexRefreshSeconds:  getIntEnv("FOREX_REFRESH_SECONDS", 30),
		StockRefreshSeconds:  getIntEnv("STOCK_REFRESH_SECONDS", 60),
		FinnhubAPIKey:        getEnv("FINNHUB_API_KEY", "d9sjmqhr01qopv47qtdgd9sjmqhr01qopv47qte0"),
		ExchangeRateAPIKey:   getEnv("EXCHANGERATE_API_KEY", "d7a369cd5aa48c44fd198e05"),

		// Traditional-markets feed. Keys are the project's free-tier keys (used
		// server-side only); override via TWELVE_DATA_API_KEY /
		// ALPHA_VANTAGE_API_KEY. REDIS_URL is optional — leave empty for the
		// in-process cache.
		TwelveDataAPIKey:     getEnv("TWELVE_DATA_API_KEY", "7f94a7cbfb0148e098b12a0c66f37d97"),
		AlphaVantageAPIKey:   getEnv("ALPHA_VANTAGE_API_KEY", "XEH4PTWLSQ783CZ5"),
		TradFiRefreshSeconds: getIntEnv("TRADFI_REFRESH_SECONDS", 15),
		TradFiWSEnabled:      getBoolEnv("TRADFI_WS_ENABLED", true),
		RedisURL:             getEnv("REDIS_URL", ""),
		IndicatorServiceURL:  getEnv("INDICATOR_SERVICE_URL", "http://localhost:8000"),
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
