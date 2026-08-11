package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cryptolytic/backend/internal/config"
	"cryptolytic/backend/internal/database"
	"cryptolytic/backend/internal/marketdata"
	"cryptolytic/backend/internal/routes"
	"cryptolytic/backend/internal/services"
	"cryptolytic/backend/internal/ws"
	"cryptolytic/backend/mocks"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	ctx := context.Background()

	pool, err := database.ConnectWithRetry(ctx, cfg.DatabaseURL, 15, 2*time.Second)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	if err := database.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Live market data: crypto streams from Binance's public API, forex from
	// exchangerate-api ⇄ Frankfurter and stocks from Yahoo Finance ⇄ Finnhub,
	// all fetched server-side on their own cadences. When a provider is
	// unreachable the providers degrade gracefully to the deterministic mock,
	// so the API stays up even without external connectivity.
	liveProvider := marketdata.NewLiveProvider(mocks.Assets, time.Duration(cfg.CryptoRefreshSeconds)*time.Second)
	globalProvider := marketdata.NewGlobalProvider(
		cfg.FinnhubAPIKey,
		cfg.ExchangeRateAPIKey,
		time.Duration(cfg.StockRefreshSeconds)*time.Second,
		time.Duration(cfg.ForexRefreshSeconds)*time.Second,
	)

	// Traditional markets (forex / indices / DXY / commodities / futures /
	// bonds): TWELVE DATA streams forex + gold over a realtime WebSocket,
	// Yahoo fills indices/DXY/futures/bonds, Alpha Vantage serves treasury /
	// inflation / commodity history. Results are cached (Redis when
	// REDIS_URL is set, otherwise in-process).
	cache, err := marketdata.NewCache(cfg.RedisURL)
	if err != nil {
		// A misconfigured or unreachable Redis must never take the API down —
		// fall back to the in-process TTL cache.
		log.Printf("warning: Redis cache unavailable (%v) — using in-process cache", err)
		cache = marketdata.NewMemoryCache()
	}
	tradfiProvider := marketdata.NewTradFiProvider(marketdata.TradFiOptions{
		TwelveDataAPIKey: cfg.TwelveDataAPIKey,
		AlphaVantageKey:  cfg.AlphaVantageAPIKey,
		WSEnabled:        cfg.TradFiWSEnabled,
		RefreshEvery:     time.Duration(cfg.TradFiRefreshSeconds) * time.Second,
		Cache:            cache,
	})
	if cfg.LiveEnabled {
		go liveProvider.Run(ctx)
		go globalProvider.Run(ctx)
		go tradfiProvider.Run(ctx)
	}

	provider := marketdata.MarketDataProvider(liveProvider)

	// Finnhub-powered research data (events calendar, company fundamentals,
	// market news). The API key is used server-side only and cached with TTLs
	// so the frontend never talks to Finnhub directly.
	finnhubData := marketdata.NewFinnhubData(cfg.FinnhubAPIKey)

	if cfg.SeedOnStartup {
		// Seed from the deterministic mock so first boot is fast, offline-safe
		// and reproducible; the live provider feeds the /api/live/* routes.
		seedSvc := services.NewSeedService(pool, marketdata.NewMockProvider(mocks.Assets))
		if err := seedSvc.SeedIfEmpty(ctx); err != nil {
			log.Fatalf("seed: %v", err)
		}
	}

	hub := ws.NewHub(provider, tradfiProvider)
	wsCtx, cancelWS := context.WithCancel(ctx)
	defer cancelWS()
	if cfg.WSEnabled {
		go hub.Run(wsCtx)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           routes.NewRouter(cfg, pool, provider, liveProvider, globalProvider, tradfiProvider, finnhubData, hub),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("cryptolytic-api listening on :%s (env=%s)", cfg.Port, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	<-stop
	log.Println("shutting down…")
	cancelWS()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Println("bye")
}
