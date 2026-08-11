package marketdata

import (
	"testing"
	"time"
)

func TestTradFiCatalog(t *testing.T) {
	p := NewTradFiProvider(TradFiOptions{RefreshEvery: 15 * time.Second, Cache: NewMemoryCache()})
	if len(p.catalog) != 32 {
		t.Fatalf("expected 32 instruments, got %d", len(p.catalog))
	}
	quotes := p.Quotes()
	if len(quotes) != len(p.catalog) {
		t.Fatalf("Quotes() returned %d, want %d", len(quotes), len(p.catalog))
	}
	for _, q := range quotes {
		if !isFinite(q.Price) || q.Price <= 0 {
			t.Fatalf("symbol %s: bad seed price %v", q.Symbol, q.Price)
		}
		if len(q.Spark) < 2 {
			t.Fatalf("symbol %s: spark too short (%d)", q.Symbol, len(q.Spark))
		}
	}
	// Catalog-order stability: Quotes() follows catalog order.
	if quotes[0].Symbol != "EUR/USD" || quotes[len(quotes)-1].Symbol != "US02Y" {
		t.Fatalf("unexpected catalog order: first=%s last=%s", quotes[0].Symbol, quotes[len(quotes)-1].Symbol)
	}
	if !p.KnownSymbol("SPX") || p.KnownSymbol("NOPE") {
		t.Fatal("KnownSymbol misbehaves")
	}
}

func TestTradFiUpdateQuote(t *testing.T) {
	p := NewTradFiProvider(TradFiOptions{Cache: NewMemoryCache()})

	// Live tick merge.
	p.updateQuote(TradQuote{Symbol: "EUR/USD", Price: 1.1550, PrevClose: 1.1540, Source: "twelvedata"})
	q, ok := p.Quote("EUR/USD")
	if !ok {
		t.Fatal("quote missing")
	}
	if q.Price != 1.1550 || !q.Live || q.ChangePct < 0.08 || q.ChangePct > 0.09 {
		t.Fatalf("bad merge: price=%v live=%v pct=%v", q.Price, q.Live, q.ChangePct)
	}
	if q.Source != "twelvedata" {
		t.Fatalf("source not updated: %s", q.Source)
	}
	sparkLen := len(q.Spark)

	// Repeated identical ticks must not duplicate spark entries.
	p.updateQuote(TradQuote{Symbol: "EUR/USD", Price: 1.1550, Source: "twelvedata"})
	q, _ = p.Quote("EUR/USD")
	if len(q.Spark) != sparkLen {
		t.Fatalf("duplicate tick appended: %d → %d", sparkLen, len(q.Spark))
	}

	// Bad values are ignored.
	p.updateQuote(TradQuote{Symbol: "EUR/USD", Price: -1, Source: "twelvedata"})
	q, _ = p.Quote("EUR/USD")
	if q.Price != 1.1550 {
		t.Fatalf("negative price applied: %v", q.Price)
	}
}

func TestTwelveBudget(t *testing.T) {
	b := &twelveBudget{}
	if !b.take(8) {
		t.Fatal("first 8 credits should fit")
	}
	if b.take(1) {
		t.Fatal("9th credit should be rejected in the same window")
	}
	// Simulate the next minute.
	b.at = b.at.Add(-time.Minute)
	if !b.take(1) {
		t.Fatal("new window should refill")
	}
}

func TestTwelveInterval(t *testing.T) {
	cases := map[string]string{
		"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min",
		"1h": "1h", "4h": "4h", "1d": "1day", "1w": "1week", "": "1day",
	}
	for in, want := range cases {
		if got := twelveInterval(in); got != want {
			t.Errorf("twelveInterval(%q) = %q, want %q", in, got, want)
		}
	}
}
