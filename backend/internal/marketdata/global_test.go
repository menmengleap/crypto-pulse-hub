package marketdata

import (
	"testing"
	"time"
)

func TestSnapshotDeepCopiesSparks(t *testing.T) {
	p := NewGlobalProvider("finnhub-key", "fx-key", 45*time.Second, 20*time.Second)

	// Seed sparks into the cache, as the refresh loop would.
	p.mu.Lock()
	p.stocks[0].Spark = []float64{1, 2, 3}
	p.forex[0].Spark = []float64{4, 5, 6}
	p.mu.Unlock()

	s1 := p.Snapshot()
	s2 := p.Snapshot()

	// Mutating a returned snapshot must not touch the cache or other copies.
	s1.Stocks[0].Spark[0] = 999
	s2.Forex[0].Spark[0] = 888

	p.mu.RLock()
	defer p.mu.RUnlock()
	if p.stocks[0].Spark[0] != 1 {
		t.Fatalf("stock snapshot spark aliases the cache: %v", p.stocks[0].Spark)
	}
	if p.forex[0].Spark[0] != 4 {
		t.Fatalf("forex snapshot spark aliases the cache: %v", p.forex[0].Spark)
	}
	if s1.Forex[0].Spark[0] != 4 {
		t.Fatalf("stock snapshot shares spark with forex snapshot: %v", s1.Forex[0].Spark)
	}
}

func TestAppendSeriesCapsLength(t *testing.T) {
	out := appendSeries(nil, []float64{1, 2, 3}, 2)
	if len(out) != 2 || out[0] != 2 || out[1] != 3 {
		t.Fatalf("cap on append: %v", out)
	}
	out = appendSeries([]float64{1, 2}, []float64{3, 4}, 5)
	if len(out) != 4 {
		t.Fatalf("expected 4 values, got %v", out)
	}
}

func TestFlipProvider(t *testing.T) {
	if flipProvider("yahoo") != "finnhub" {
		t.Fatal("yahoo should flip to finnhub")
	}
	if flipProvider("finnhub") != "yahoo" {
		t.Fatal("finnhub should flip to yahoo")
	}
	if flipProvider("exchangerate-api") != "frankfurter" {
		t.Fatal("exchangerate-api should flip to frankfurter")
	}
	if flipProvider("frankfurter") != "exchangerate-api" {
		t.Fatal("frankfurter should flip to exchangerate-api")
	}
}

func TestComputeForexModes(t *testing.T) {
	p := NewGlobalProvider("k", "k", 45*time.Second, 20*time.Second)
	// USD-based rates: 1 USD = 0.9 EUR, 1 USD = 150 JPY.
	rates := map[string]float64{"EUR": 0.9, "GBP": 0.75, "JPY": 150}

	tests := []struct {
		symbol string
		want   float64
	}{
		{"EUR/USD", 1 / 0.9},
		{"USD/JPY", 150},
		{"EUR/GBP", 0.75 / 0.9},
	}
	for _, tt := range tests {
		var tkr ForexTicker
		for _, f := range p.forex {
			if f.Symbol == tt.symbol {
				tkr = f
				break
			}
		}
		if tkr.Symbol == "" {
			t.Fatalf("missing catalog symbol %s", tt.symbol)
		}
		got := p.computeForex(&tkr, rates)
		if diff := got - tt.want; diff > 0.0001 || diff < -0.0001 {
			t.Errorf("%s: got %f want %f", tt.symbol, got, tt.want)
		}
	}
}
