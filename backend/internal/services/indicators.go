package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"cryptolytic/backend/internal/indicators"
	"cryptolytic/backend/internal/marketdata"
)

// IndicatorCalculateRequest is the API-surface payload for
// POST /api/indicators/calculate. Candles and indicator specs are validated by
// the handlers package (validator tags on the nested types).
type IndicatorCalculateRequest struct {
	Symbol     string              `json:"symbol" validate:"required,uppercase"`
	Timeframe  string              `json:"timeframe" validate:"required"`
	Candles    []indicators.Candle `json:"candles" validate:"required,min=5,max=2000,dive"`
	Indicators []indicators.Spec   `json:"indicators" validate:"required,min=1,max=10,dive"`
}

// ErrInvalidRequest is returned for payloads that pass decoding but fail the
// gateway's own semantic checks (bad timeframe, bad indicator params). It is
// surfaced as HTTP 400 — a fast failure without a round-trip to Python.
var ErrInvalidRequest = errors.New("invalid indicator request")

// ErrServiceUnavailable aliases the client's sentinel so handlers can check a
// single package for both error kinds.
var ErrServiceUnavailable = indicators.ErrServiceUnavailable

// IndicatorService forwards indicator calculations to the Python microservice
// and keeps it warm while the gateway is up.
type IndicatorService struct {
	client *indicators.Client
}

// NewIndicatorService creates the service and starts a background keep-alive
// that pings the Python /health endpoint every minute, so a long-idle Render
// free instance doesn't pay the cold-start tax on the first real request.
func NewIndicatorService(baseURL string) *IndicatorService {
	s := &IndicatorService{client: indicators.NewClient(baseURL)}
	// Only keep the remote service warm in real deployments — pinging a local
	// dev default (or an unreachable misconfigured URL) every minute is noise.
	if !isLoopback(baseURL) {
		go s.warmupLoop()
	}
	return s
}

func isLoopback(baseURL string) bool {
	b := strings.ToLower(baseURL)
	return strings.Contains(b, "localhost") ||
		strings.Contains(b, "127.0.0.1") ||
		strings.Contains(b, "0.0.0.0") ||
		strings.Contains(b, "::1")
}

func (s *IndicatorService) warmupLoop() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		_ = s.client.Health(ctx)
		cancel()
	}
}

// Calculate validates the request and forwards it to the Python service.
func (s *IndicatorService) Calculate(ctx context.Context, req *IndicatorCalculateRequest) (*indicators.Response, error) {
	if _, ok := marketdata.SupportedTimeframes[req.Timeframe]; !ok {
		return nil, fmt.Errorf("%w: timeframe must be one of 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w", ErrInvalidRequest)
	}
	if err := validateSpecs(req.Indicators); err != nil {
		return nil, err
	}

	return s.client.Calculate(ctx, &indicators.Request{
		Symbol:     req.Symbol,
		Timeframe:  req.Timeframe,
		Candles:    req.Candles,
		Indicators: req.Indicators,
	})
}

// validateSpecs enforces per-indicator param bounds. The Python service applies
// the same rules; this gives a fast 400 without a network round-trip.
func validateSpecs(specs []indicators.Spec) error {
	for _, spec := range specs {
		switch spec.Type {
		case "sma", "ema":
			if err := intParam(spec.Params, "period", 2, 500); err != nil {
				return fmt.Errorf("%w: indicator %s: %s", ErrInvalidRequest, spec.Type, err)
			}
		case "rsi", "atr":
			if err := intParam(spec.Params, "period", 2, 250); err != nil {
				return fmt.Errorf("%w: indicator %s: %s", ErrInvalidRequest, spec.Type, err)
			}
		case "macd":
			fast, err := intParamVal(spec.Params, "fast", 2, 200)
			if err != nil {
				return fmt.Errorf("%w: indicator macd: %s", ErrInvalidRequest, err)
			}
			slow, err := intParamVal(spec.Params, "slow", 3, 300)
			if err != nil {
				return fmt.Errorf("%w: indicator macd: %s", ErrInvalidRequest, err)
			}
			if fast >= slow {
				return fmt.Errorf("%w: indicator macd: fast must be < slow", ErrInvalidRequest)
			}
			if _, err := intParamVal(spec.Params, "signal", 2, 100); err != nil {
				return fmt.Errorf("%w: indicator macd: %s", ErrInvalidRequest, err)
			}
		case "bollinger":
			if err := intParam(spec.Params, "period", 2, 500); err != nil {
				return fmt.Errorf("%w: indicator bollinger: %s", ErrInvalidRequest, err)
			}
			if err := floatParam(spec.Params, "stdDev", 0.1, 10); err != nil {
				return fmt.Errorf("%w: indicator bollinger: %s", ErrInvalidRequest, err)
			}
		case "stochastic":
			if err := intParam(spec.Params, "period", 2, 250); err != nil {
				return fmt.Errorf("%w: indicator stochastic: %s", ErrInvalidRequest, err)
			}
			if err := intParam(spec.Params, "smoothK", 1, 50); err != nil {
				return fmt.Errorf("%w: indicator stochastic: %s", ErrInvalidRequest, err)
			}
			if err := intParam(spec.Params, "smoothD", 1, 50); err != nil {
				return fmt.Errorf("%w: indicator stochastic: %s", ErrInvalidRequest, err)
			}
		}
	}
	return nil
}

func intParam(params map[string]float64, key string, lo, hi int) error {
	_, err := intParamVal(params, key, lo, hi)
	return err
}

func intParamVal(params map[string]float64, key string, lo, hi int) (int, error) {
	v, ok := params[key]
	if !ok {
		return 0, fmt.Errorf("%s is required", key)
	}
	n := int(v)
	if float64(n) != v {
		return 0, fmt.Errorf("%s must be a whole number", key)
	}
	if n < lo || n > hi {
		return 0, fmt.Errorf("%s must be between %d and %d", key, lo, hi)
	}
	return n, nil
}

func floatParam(params map[string]float64, key string, lo, hi float64) error {
	v, ok := params[key]
	if !ok {
		return fmt.Errorf("%s is required", key)
	}
	if v < lo || v > hi {
		return fmt.Errorf("%s must be between %g and %g", key, lo, hi)
	}
	return nil
}
