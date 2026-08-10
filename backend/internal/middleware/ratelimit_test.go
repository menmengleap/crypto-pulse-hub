package middleware

import (
	"net/http"
	"testing"
)

func TestClientIPFromForwardedFor(t *testing.T) {
	tests := []struct {
		name      string
		forwarded string
		remote    string
		want      string
	}{
		{"single forwarded ip", "203.0.113.7", "10.0.0.1:1234", "203.0.113.7"},
		{"chain takes left-most", "203.0.113.7, 10.0.0.2, 10.0.0.3", "10.0.0.1:1234", "203.0.113.7"},
		{"spaces around comma", "203.0.113.9 , 10.0.0.2", "10.0.0.1:1234", "203.0.113.9"},
		{"no header falls back to remote", "", "198.51.100.4:5678", "198.51.100.4"},
		{"garbage header falls back to remote", "not-an-ip", "198.51.100.5:5678", "198.51.100.5"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &http.Request{
				RemoteAddr: tt.remote,
				Header:     http.Header{},
			}
			if tt.forwarded != "" {
				r.Header.Set("X-Forwarded-For", tt.forwarded)
			}
			if got := clientIP(r); got != tt.want {
				t.Fatalf("clientIP(%q, %q) = %q, want %q", tt.forwarded, tt.remote, got, tt.want)
			}
		})
	}
}

// TestRateLimitPerIP verifies two distinct clients get independent buckets.
func TestRateLimitPerIP(t *testing.T) {
	rl := NewRateLimit(10, 5)
	defer rl.Stop()

	mk := func(ip string) *http.Request {
		return &http.Request{RemoteAddr: ip, Header: http.Header{}}
	}
	a := rl.get("1.2.3.4")
	b := rl.get("5.6.7.8")
	if a == b {
		t.Fatal("distinct IPs must not share a bucket")
	}
	_ = mk("1.2.3.4")
}
