// Package indicators implements the HTTP client for the Python technical
// indicator microservice (FastAPI, python-indicators/). The Go API acts as a
// gateway: browsers send OHLCV + indicator specs to POST /api/indicators/
// calculate and this client forwards the *same* payload to the Python service,
// then returns the computed series verbatim.
//
// Callers must never talk to the Python service directly — only this package
// (via the services layer) does.
package indicators

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ErrServiceUnavailable is returned when the Python service cannot be reached
// or answers with an error status (5xx / transport failure). Handlers surface
// it as HTTP 503.
var ErrServiceUnavailable = errors.New("indicator service unavailable")

// InvalidRequestError is returned when the Python service rejects the payload
// (4xx) — normally a validation mismatch between gateway and service.
type InvalidRequestError struct {
	Detail string
}

func (e *InvalidRequestError) Error() string {
	return "indicator service rejected request: " + e.Detail
}

// Candle is one OHLCV bar (epoch seconds). The validate tags back the gateway's
// request validation (see services.IndicatorCalculateRequest).
type Candle struct {
	Time   int64   `json:"time" validate:"gt=0"`
	Open   float64 `json:"open" validate:"gt=0"`
	High   float64 `json:"high" validate:"gt=0"`
	Low    float64 `json:"low" validate:"gt=0"`
	Close  float64 `json:"close" validate:"gt=0"`
	Volume float64 `json:"volume" validate:"gte=0"`
}

// Spec asks for one indicator computation, e.g.
// {"type": "sma", "params": {"period": 20}}.
type Spec struct {
	Type   string             `json:"type" validate:"required,oneof=sma ema rsi macd bollinger atr stochastic obv"`
	Params map[string]float64 `json:"params"`
}

// Request is the wire payload forwarded verbatim to the Python service.
type Request struct {
	Symbol     string   `json:"symbol"`
	Timeframe  string   `json:"timeframe"`
	Candles    []Candle `json:"candles"`
	Indicators []Spec   `json:"indicators"`
}

// Point is a single value of an indicator series (warm-up values are dropped
// by the service, so every point is meaningful).
type Point struct {
	Time  int64   `json:"time"`
	Value float64 `json:"value"`
}

// IndicatorResult is one computed indicator. Lines maps a label to its series,
// e.g. {"sma": [...]}, {"upper"/"middle"/"lower"} for bollinger, or
// {"macd"/"signal"/"histogram"} for macd.
type IndicatorResult struct {
	Type   string             `json:"type"`
	Params map[string]float64 `json:"params"`
	Lines  map[string][]Point `json:"lines"`
}

// Response mirrors the Python service's response envelope.
type Response struct {
	Symbol     string            `json:"symbol"`
	Timeframe  string            `json:"timeframe"`
	ComputedAt string            `json:"computedAt"`
	Results    []IndicatorResult `json:"results"`
}

// Client talks to the Python FastAPI service.
type Client struct {
	baseURL string
	http    *http.Client
}

// NewClient returns a client for the given base URL (e.g. http://localhost:8000
// or https://python-indicators.onrender.com). The generous timeout absorbs
// Render free-tier cold starts (the instance can take ~20s to wake).
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 25 * time.Second},
	}
}

// Calculate forwards an indicator request and returns the computed series.
func (c *Client) Calculate(ctx context.Context, req *Request) (*Response, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("encode indicator request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+"/api/v1/indicators/calculate",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, fmt.Errorf("%w: build request: %v", ErrServiceUnavailable, err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	res, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrServiceUnavailable, err)
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("%w: read response: %v", ErrServiceUnavailable, err)
	}

	switch {
	case res.StatusCode >= 200 && res.StatusCode < 300:
		var out Response
		if err := json.Unmarshal(raw, &out); err != nil {
			return nil, fmt.Errorf("%w: decode response: %v", ErrServiceUnavailable, err)
		}
		return &out, nil
	case res.StatusCode == http.StatusBadRequest || res.StatusCode == http.StatusUnprocessableEntity:
		return nil, &InvalidRequestError{Detail: strings.TrimSpace(string(raw))}
	default:
		return nil, fmt.Errorf("%w: service returned HTTP %d", ErrServiceUnavailable, res.StatusCode)
	}
}

// Health pings the Python service liveness endpoint. The service layer uses it
// to keep a long-idle Render free instance warm.
func (c *Client) Health(ctx context.Context) error {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/health", nil)
	if err != nil {
		return err
	}
	res, err := c.http.Do(httpReq)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 4096))
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("indicator health returned HTTP %d", res.StatusCode)
	}
	return nil
}
