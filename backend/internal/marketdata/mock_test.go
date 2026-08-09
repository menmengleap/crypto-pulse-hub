package marketdata

import (
	"testing"
)

func testAssets() []AssetMeta {
	return []AssetMeta{
		{Symbol: "BTC", Name: "Bitcoin", Pair: "BTC/USDT", Sector: "Bitcoin", BasePrice: 64800, Volatility: 0.006},
		{Symbol: "ETH", Name: "Ethereum", Pair: "ETH/USDT", Sector: "Ethereum", BasePrice: 3150, Volatility: 0.008},
		{Symbol: "SOL", Name: "Solana", Pair: "SOL/USDT", Sector: "Layer 1", BasePrice: 142, Volatility: 0.012},
		{Symbol: "PEPE", Name: "Pepe", Pair: "PEPE/USDT", Sector: "Meme", BasePrice: 0.000012, Volatility: 0.02},
	}
}

func TestCandlesAreDeterministic(t *testing.T) {
	p1 := NewMockProvider(testAssets())
	p2 := NewMockProvider(testAssets())

	c1, err := p1.Candles("BTC", "4h", 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	c2, err := p2.Candles("BTC", "4h", 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(c1) != 100 || len(c2) != 100 {
		t.Fatalf("expected 100 candles, got %d and %d", len(c1), len(c2))
	}
	for i := range c1 {
		if c1[i].Open != c2[i].Open || c1[i].Close != c2[i].Close || c1[i].High != c2[i].High || c1[i].Low != c2[i].Low || c1[i].Volume != c2[i].Volume {
			t.Fatalf("candle %d differs between runs: %+v vs %+v", i, c1[i], c2[i])
		}
	}
}

func TestCandleInvariants(t *testing.T) {
	p := NewMockProvider(testAssets())
	for _, tf := range []string{"1m", "5m", "15m", "1h", "4h", "1d", "1w"} {
		candles, err := p.Candles("PEPE", tf, 50)
		if err != nil {
			t.Fatalf("timeframe %s: %v", tf, err)
		}
		last := int64(0)
		for i, c := range candles {
			if c.High < c.Open || c.High < c.Close {
				t.Errorf("timeframe %s candle %d: high %f below open/close (%f/%f)", tf, i, c.High, c.Open, c.Close)
			}
			if c.Low > c.Open || c.Low > c.Close {
				t.Errorf("timeframe %s candle %d: low %f above open/close (%f/%f)", tf, i, c.Low, c.Open, c.Close)
			}
			if c.Low <= 0 {
				t.Errorf("timeframe %s candle %d: non-positive low %f", tf, i, c.Low)
			}
			if c.Volume <= 0 {
				t.Errorf("timeframe %s candle %d: non-positive volume %f", tf, i, c.Volume)
			}
			if i > 0 && c.Timestamp <= last {
				t.Errorf("timeframe %s candle %d: timestamps not strictly increasing", tf, i)
			}
			last = c.Timestamp
		}
	}
}

func TestIndicatorsWithinBounds(t *testing.T) {
	p := NewMockProvider(testAssets())
	ind, err := p.Indicators("BTC", "4h")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ind.RSI < 0 || ind.RSI > 100 {
		t.Errorf("RSI %f outside [0,100]", ind.RSI)
	}
	if ind.Support <= 0 || ind.Resistance < ind.Support {
		t.Errorf("support/resistance invalid: %f / %f", ind.Support, ind.Resistance)
	}
	if ind.EMA20 <= 0 || ind.EMA50 <= 0 || ind.EMA200 <= 0 {
		t.Errorf("negative EMA values: %f/%f/%f", ind.EMA20, ind.EMA50, ind.EMA200)
	}
}

func TestSnapshotsDeterministicAndSorted(t *testing.T) {
	p1 := NewMockProvider(testAssets())
	p2 := NewMockProvider(testAssets())
	s1, err := p1.Snapshots()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	s2, err := p2.Snapshots()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(s1) != len(testAssets()) {
		t.Fatalf("expected %d snapshots, got %d", len(testAssets()), len(s1))
	}
	for i := range s1 {
		if s1[i].Price != s2[i].Price || s1[i].Change24h != s2[i].Change24h {
			t.Fatalf("snapshot %d differs between runs", i)
		}
		if s1[i].Price <= 0 {
			t.Errorf("snapshot %d has non-positive price", i)
		}
	}
}

func TestUnknownSymbolFails(t *testing.T) {
	p := NewMockProvider(testAssets())
	if _, err := p.Candles("NOPE", "1h", 10); err == nil {
		t.Error("expected error for unknown symbol")
	}
	if _, err := p.Snapshot("NOPE"); err == nil {
		t.Error("expected error for unknown symbol")
	}
	if _, err := p.Candles("BTC", "3h", 10); err == nil {
		t.Error("expected error for unsupported timeframe")
	}
}
