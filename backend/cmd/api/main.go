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

	// The mock provider is the default data source. Swap this one line for a
	// real exchange provider later — nothing else in the app needs to change.
	provider := marketdata.NewMockProvider(mocks.Assets)

	if cfg.SeedOnStartup {
		seedSvc := services.NewSeedService(pool, provider)
		if err := seedSvc.SeedIfEmpty(ctx); err != nil {
			log.Fatalf("seed: %v", err)
		}
	}

	hub := ws.NewHub(provider)
	wsCtx, cancelWS := context.WithCancel(ctx)
	defer cancelWS()
	if cfg.WSEnabled {
		go hub.Run(wsCtx)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           routes.NewRouter(cfg, pool, provider, hub),
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
