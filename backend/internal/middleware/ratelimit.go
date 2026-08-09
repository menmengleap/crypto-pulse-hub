package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const (
	cleanupInterval = 5 * time.Minute
	cleanupAfter    = 15 * time.Minute
)

// RateLimit is a per-IP token bucket limiter with automatic cleanup.
type RateLimit struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	lastSeen map[string]time.Time
	rate     rate.Limit
	burst    int
	stop     chan struct{}
}

type bucket struct {
	limiter *rate.Limiter
}

// NewRateLimit creates a limiter allowing `rps` requests per second with a
// burst of `burst` per IP. A background goroutine evicts buckets for IPs that
// have been idle for a while, so the map cannot grow without bound.
func NewRateLimit(rps float64, burst int) *RateLimit {
	if rps <= 0 {
		rps = 20
	}
	if burst <= 0 {
		burst = 40
	}
	rl := &RateLimit{
		buckets:  map[string]*bucket{},
		lastSeen: map[string]time.Time{},
		rate:     rate.Limit(rps),
		burst:    burst,
		stop:     make(chan struct{}),
	}
	go rl.cleanupLoop()
	return rl
}

// Stop halts the background cleanup goroutine (used in tests and shutdown).
func (rl *RateLimit) Stop() {
	select {
	case <-rl.stop:
	default:
		close(rl.stop)
	}
}

func (rl *RateLimit) get(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.lastSeen[ip] = time.Now()
	if b, ok := rl.buckets[ip]; ok {
		return b.limiter
	}
	b := &bucket{limiter: rate.NewLimiter(rl.rate, rl.burst)}
	rl.buckets[ip] = b
	return b.limiter
}

func (rl *RateLimit) cleanupLoop() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()
	for {
		select {
		case <-rl.stop:
			return
		case <-ticker.C:
			rl.cleanup()
		}
	}
}

func (rl *RateLimit) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	cutoff := time.Now().Add(-cleanupAfter)
	for ip, seen := range rl.lastSeen {
		if seen.Before(cutoff) {
			delete(rl.buckets, ip)
			delete(rl.lastSeen, ip)
		}
	}
}

// Middleware returns the HTTP middleware.
func (rl *RateLimit) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)
			if !rl.get(ip).Allow() {
				writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests, slow down")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		if ip, _, err := net.SplitHostPort(forwarded); err == nil {
			return ip
		}
		if ip := net.ParseIP(forwarded); ip != nil {
			return ip.String()
		}
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
