package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/config"
	"cryptolytic/backend/internal/handlers"
	"cryptolytic/backend/internal/marketdata"
	"cryptolytic/backend/internal/middleware"
	"cryptolytic/backend/internal/repositories"
	"cryptolytic/backend/internal/services"
	"cryptolytic/backend/internal/ws"
)

// NewRouter assembles the full HTTP API. `provider` backs the WebSocket stream
// and AI analysis; `live` and `global` back the /api/live/* market-data routes.
func NewRouter(cfg *config.Config, pool *pgxpool.Pool, provider marketdata.MarketDataProvider, live *marketdata.LiveProvider, global *marketdata.GlobalProvider, hub *ws.Hub) http.Handler {
	// Repositories
	userRepo := repositories.NewUserRepo(pool)
	sessionRepo := repositories.NewSessionRepo(pool)
	watchlistRepo := repositories.NewWatchlistRepo(pool)
	analysisRepo := repositories.NewAnalysisRepo(pool)
	alertRepo := repositories.NewAlertRepo(pool)
	newsRepo := repositories.NewNewsRepo(pool)
	marketRepo := repositories.NewMarketRepo(pool)

	// Services
	authSvc := services.NewAuthService(userRepo, sessionRepo, cfg)
	aiSvc := services.NewAIService(pool, provider, marketRepo)

	// Handlers
	authH := handlers.NewAuthHandler(authSvc, cfg)
	userH := handlers.NewUserHandler(authSvc)
	marketH := handlers.NewMarketHandler(marketRepo)
	watchlistH := handlers.NewWatchlistHandler(watchlistRepo)
	analysisH := handlers.NewAnalysisHandler(analysisRepo)
	alertH := handlers.NewAlertHandler(alertRepo)
	newsH := handlers.NewNewsHandler(newsRepo)
	aiH := handlers.NewAIHandler(aiSvc)
	healthH := handlers.NewHealthHandler(pool)
	liveH := handlers.NewLiveHandler(live, global)
	indicatorH := handlers.NewIndicatorHandler(services.NewIndicatorService(cfg.IndicatorServiceURL))

	rateLimit := middleware.NewRateLimit(cfg.RateLimitRPS, cfg.RateLimitBurst)

	r := chi.NewRouter()
	r.Use(middleware.RequestLogger)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(rateLimit.Middleware())

	r.Get("/api/health", healthH.Check)
	// Bare /health alias — uptime monitors and older clients hit the backend
	// origin directly (e.g. https://cryptolytic-api.onrender.com/health).
	r.Get("/health", healthH.Check)

	// --- Public market data (read-only) ---
	r.Get("/api/markets", marketH.ListMarkets)
	r.Get("/api/markets/{symbol}", marketH.GetMarket)
	r.Get("/api/markets/{symbol}/history", marketH.GetHistory)
	r.Get("/api/markets/{symbol}/indicators", marketH.GetIndicators)
	r.Get("/api/market-overview", marketH.Overview)

	// --- Live market data (server-side provider fetching, cached) ---
	r.Get("/api/live/markets", liveH.Markets)
	r.Get("/api/live/global", liveH.Global)
	r.Get("/api/live/klines", liveH.Klines)
	r.Get("/api/live/sparks", liveH.Sparks)
	r.Get("/api/live/stocks", liveH.Stocks)
	r.Get("/api/live/forex", liveH.Forex)
	r.Get("/api/live/providers", liveH.Providers)

	// --- Technical indicators (forwarded to the Python microservice) ---
	r.Post("/api/indicators/calculate", indicatorH.Calculate)

	r.Get("/api/market-cap", marketH.MarketCap)
	r.Get("/api/market-volume", marketH.MarketVolume)
	r.Get("/api/open-interest", marketH.OpenInterest)
	r.Get("/api/bitcoin-dominance", marketH.BitcoinDominance)
	r.Get("/api/sentiment", marketH.Sentiment)
	r.Get("/api/fear-greed", marketH.FearGreed)
	r.Get("/api/heatmap", marketH.Heatmap)

	// --- News (public) ---
	r.Get("/api/news", newsH.List)
	r.Get("/api/news/categories", newsH.Categories)
	r.Get("/api/news/trending", newsH.Trending)
	r.Get("/api/news/{id}", newsH.Get)

	// --- WebSocket market stream ---
	if cfg.WSEnabled {
		r.Get("/api/ws/markets", hub.ServeWS)
	}

	// --- Auth ---
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authH.Register)
		r.Post("/login", authH.Login)
		r.Post("/refresh", authH.Refresh)
		r.Post("/logout", authH.Logout)
		r.Post("/forgot-password", authH.ForgotPassword)
		r.Post("/reset-password", authH.ResetPassword)

		// OAuth (Google / GitHub) — the browser is redirected to the provider
		// and lands back on /callback, which redirects to the frontend.
		r.Get("/google", authH.OAuthStart(services.ProviderGoogle))
		r.Get("/google/callback", authH.OAuthCallback(services.ProviderGoogle))
		r.Get("/github", authH.OAuthStart(services.ProviderGitHub))
		r.Get("/github/callback", authH.OAuthCallback(services.ProviderGitHub))
	})

	// --- Authenticated routes ---
	r.Group(func(r chi.Router) {
		r.Use(middleware.RequireAuth(authSvc))

		r.Get("/api/me", userH.Me)
		r.Patch("/api/me", userH.UpdateMe)
		r.Patch("/api/me/profile", userH.UpdateProfile)
		r.Patch("/api/me/preferences", userH.UpdatePreferences)

		r.Get("/api/watchlists", watchlistH.List)
		r.Post("/api/watchlists", watchlistH.Create)
		r.Patch("/api/watchlists/{id}", watchlistH.Update)
		r.Delete("/api/watchlists/{id}", watchlistH.Delete)
		r.Post("/api/watchlists/{id}/assets", watchlistH.AddItem)
		r.Delete("/api/watchlists/{id}/assets/{symbol}", watchlistH.RemoveItem)

		r.Get("/api/analyses", analysisH.List)
		r.Post("/api/analyses", analysisH.Create)
		r.Get("/api/analyses/{id}", analysisH.Get)
		r.Delete("/api/analyses/{id}", analysisH.Delete)

		r.Get("/api/alerts", alertH.List)
		r.Post("/api/alerts", alertH.Create)
		r.Patch("/api/alerts/{id}", alertH.Update)
		r.Delete("/api/alerts/{id}", alertH.Delete)

		r.Post("/api/ai/analyze", aiH.Analyze)
		r.Get("/api/ai/analyses", aiH.List)
		r.Get("/api/ai/analyses/{id}", aiH.Get)
	})

	return r
}
