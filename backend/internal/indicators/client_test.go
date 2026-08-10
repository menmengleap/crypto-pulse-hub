package indicators

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCalculateSuccess(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/indicators/calculate" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"symbol": "BTC", "timeframe": "4h", "computedAt": "2026-01-01T00:00:00Z",
			"results": [{"type": "sma", "params": {"period": 20},
				"lines": {"sma": [{"time": 1700000000, "value": 2.5}]}}]
		}`))
	}))
	defer ts.Close()

	resp, err := NewClient(ts.URL).Calculate(context.Background(), &Request{Symbol: "BTC"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Symbol != "BTC" || resp.Timeframe != "4h" {
		t.Fatalf("unexpected envelope: %+v", resp)
	}
	if len(resp.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(resp.Results))
	}
	r := resp.Results[0]
	if r.Type != "sma" || r.Params["period"] != 20 || r.Lines["sma"][0].Value != 2.5 {
		t.Fatalf("unexpected result: %+v", r)
	}
}

func TestCalculateValidationError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"detail":"candles must be sorted ascending"}`))
	}))
	defer ts.Close()

	_, err := NewClient(ts.URL).Calculate(context.Background(), &Request{})
	var invalid *InvalidRequestError
	if !errors.As(err, &invalid) {
		t.Fatalf("expected *InvalidRequestError, got %v", err)
	}
}

func TestCalculateServiceError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	_, err := NewClient(ts.URL).Calculate(context.Background(), &Request{})
	if !errors.Is(err, ErrServiceUnavailable) {
		t.Fatalf("expected ErrServiceUnavailable, got %v", err)
	}
}

func TestCalculateConnectionFailure(t *testing.T) {
	// Port 1 is never listening locally — the request must fail fast and map
	// to ErrServiceUnavailable rather than a bare transport error.
	_, err := NewClient("http://127.0.0.1:1").Calculate(context.Background(), &Request{})
	if !errors.Is(err, ErrServiceUnavailable) {
		t.Fatalf("expected ErrServiceUnavailable, got %v", err)
	}
}

func TestHealthOK(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"status":"healthy"}`))
	}))
	defer ts.Close()

	if err := NewClient(ts.URL).Health(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
