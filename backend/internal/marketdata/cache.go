package marketdata

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache is the shared key/value cache used by the traditional-markets feed
// (TWELVE DATA, Yahoo Finance, Alpha Vantage). It is Redis when REDIS_URL is
// configured and an in-process TTL map otherwise — identical shape either way,
// so local dev and single-instance deployments (e.g. Render without a Redis
// add-on) work out of the box.
type Cache interface {
	Get(ctx context.Context, key string) ([]byte, bool)
	Set(ctx context.Context, key string, v []byte, ttl time.Duration) error
}

// NewCache builds a cache from a Redis URL. An empty URL returns a memory cache.
func NewCache(redisURL string) (Cache, error) {
	if redisURL == "" {
		return NewMemoryCache(), nil
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opts)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}
	return &RedisCache{rdb: rdb}, nil
}

// ---------------------------------------------------------------------------
// In-process TTL cache (default)
// ---------------------------------------------------------------------------

type memEntry struct {
	v   []byte
	exp time.Time
}

type MemoryCache struct {
	mu sync.Mutex
	m  map[string]memEntry
}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{m: map[string]memEntry{}}
}

func (c *MemoryCache) Get(_ context.Context, key string) ([]byte, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.m[key]
	if !ok {
		return nil, false
	}
	if !e.exp.IsZero() && time.Now().After(e.exp) {
		delete(c.m, key)
		return nil, false
	}
	return e.v, true
}

func (c *MemoryCache) Set(_ context.Context, key string, v []byte, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[key] = memEntry{v: v, exp: time.Now().Add(ttl)}
	return nil
}

// ---------------------------------------------------------------------------
// Redis cache (optional)
// ---------------------------------------------------------------------------

type RedisCache struct {
	rdb *redis.Client
}

func (c *RedisCache) Get(ctx context.Context, key string) ([]byte, bool) {
	b, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	return b, true
}

func (c *RedisCache) Set(ctx context.Context, key string, v []byte, ttl time.Duration) error {
	return c.rdb.Set(ctx, key, v, ttl).Err()
}

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

// cacheGetJSON loads and unmarshals a cached value into out. The bool reports
// whether a fresh value was found.
func cacheGetJSON[T any](ctx context.Context, c Cache, key string) (T, bool) {
	var out T
	b, ok := c.Get(ctx, key)
	if !ok {
		return out, false
	}
	if err := json.Unmarshal(b, &out); err != nil {
		return out, false
	}
	return out, true
}

func cacheSetJSON[T any](ctx context.Context, c Cache, key string, v T, ttl time.Duration) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return c.Set(ctx, key, b, ttl)
}
