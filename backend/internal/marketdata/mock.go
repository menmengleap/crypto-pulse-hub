package marketdata

import (
	"errors"
	"fmt"
	"hash/fnv"
	"math"
	"math/rand"
	"time"
)

// MockMarketDataProvider generates realistic, deterministic market data using a
// seeded random walk. The same seed always produces the same series, which
// makes development and tests reproducible. It requires no external services.
type MockMarketDataProvider struct {
	assets []AssetMeta
	supply map[string]float64
	seed   int64
}

// NewMockProvider builds a provider from the given asset catalog.
func NewMockProvider(assets []AssetMeta) *MockMarketDataProvider {
	supply := map[string]float64{}
	for _, a := range assets {
		supply[a.Symbol] = supplyFor(a.Symbol, a.BasePrice)
	}
	return &MockMarketDataProvider{assets: assets, supply: supply, seed: 42}
}

func supplyFor(symbol string, basePrice float64) float64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(symbol + ":supply"))
	rnd := rand.New(rand.NewSource(int64(h.Sum64())))
	// Market cap between ~0.5x and ~20x the notional base.
	cap := basePrice * (0.5 + rnd.Float64()*19.5)
	if cap < 100_000_000 {
		cap = 100_000_000
	}
	return cap / basePrice
}

func (m *MockMarketDataProvider) symbolIndex(symbol string) (AssetMeta, error) {
	for _, a := range m.assets {
		if a.Symbol == symbol {
			return a, nil
		}
	}
	return AssetMeta{}, fmt.Errorf("unknown symbol %q", symbol)
}

func (m *MockMarketDataProvider) rng(symbol string, salt int64) *rand.Rand {
	h := fnv.New64a()
	_, _ = h.Write([]byte(symbol))
	return rand.New(rand.NewSource(int64(h.Sum64()) + m.seed + salt))
}

// Assets returns the catalog. It is deterministic.
func (m *MockMarketDataProvider) Assets() []AssetMeta {
	out := make([]AssetMeta, len(m.assets))
	copy(out, m.assets)
	return out
}

// generateCandles produces `count` OHLCV candles ending at the current
// timeframe boundary using a trended price walk.
func (m *MockMarketDataProvider) generateCandles(meta AssetMeta, timeframe string, count int) ([]Candle, error) {
	interval, ok := SupportedTimeframes[timeframe]
	if !ok {
		return nil, fmt.Errorf("unsupported timeframe %q", timeframe)
	}
	if count < 2 {
		count = 2
	}

	rnd := m.rng(meta.Symbol, int64(interval.Minutes()*1000))
	trendBias := (rnd.Float64() - 0.48) * meta.Volatility * 1.2 // per-symbol directional drift
	price := meta.BasePrice * (0.9 + rnd.Float64()*0.2)
	vol := meta.BasePrice * meta.Volatility
	volRef := meta.BasePrice * meta.Volatility * 40

	end := time.Now().UTC().Truncate(interval)
	ts := end.Add(-interval * time.Duration(count))

	candles := make([]Candle, 0, count)
	for i := 0; i < count; i++ {
		open := price
		step := (rnd.Float64()-0.5)*2*vol + trendBias*interval.Hours()
		close := open + step
		if close <= 0 {
			close = open * 0.995
		}
		high := math.Max(open, close) + rnd.Float64()*vol*0.5
		low := math.Min(open, close) - rnd.Float64()*vol*0.5
		if low <= 0 {
			low = high * 0.98
		}
		candles = append(candles, Candle{
			Timestamp: ts.Unix(),
			Open:      round(open, 8),
			High:      round(high, 8),
			Low:       round(low, 8),
			Close:     round(close, 8),
			Volume:    math.Max(round(volRef*(0.4+rnd.Float64()*1.6), 6), volRef*0.05),
		})
		price = close
		ts = ts.Add(interval)
	}
	return candles, nil
}

// Candles returns the deterministic candle series for a symbol/timeframe.
func (m *MockMarketDataProvider) Candles(symbol, timeframe string, limit int) ([]Candle, error) {
	meta, err := m.symbolIndex(symbol)
	if err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	return m.generateCandles(meta, timeframe, limit)
}

// snapshot computes the current ticker state from hourly candles.
func (m *MockMarketDataProvider) snapshot(meta AssetMeta) (Snapshot, error) {
	candles, err := m.generateCandles(meta, "1h", 24*7)
	if err != nil {
		return Snapshot{}, err
	}
	last := candles[len(candles)-1]
	dayStart := candles[len(candles)-24]
	weekStart := candles[0]

	var high, low, vol float64
	high, low = last.High, last.Low
	for _, c := range candles[len(candles)-24:] {
		vol += c.Volume
		if c.High > high {
			high = c.High
		}
		if c.Low < low {
			low = c.Low
		}
	}
	change24h := pctChange(dayStart.Open, last.Close)
	change7d := pctChange(weekStart.Open, last.Close)
	ind, err := m.Indicators(meta.Symbol, "4h")
	if err != nil {
		return Snapshot{}, err
	}
	return Snapshot{
		Symbol:    meta.Symbol,
		Price:     last.Close,
		Change24h: change24h,
		Change7d:  change7d,
		High24h:   high,
		Low24h:    low,
		Volume24h: vol,
		MarketCap: meta.BasePrice * m.supply[meta.Symbol],
		RSI:       ind.RSI,
	}, nil
}

// Snapshot returns the current state of one market.
func (m *MockMarketDataProvider) Snapshot(symbol string) (Snapshot, error) {
	meta, err := m.symbolIndex(symbol)
	if err != nil {
		return Snapshot{}, err
	}
	return m.snapshot(meta)
}

// Snapshots returns the current state of every market.
func (m *MockMarketDataProvider) Snapshots() ([]Snapshot, error) {
	out := make([]Snapshot, 0, len(m.assets))
	for _, a := range m.assets {
		s, err := m.snapshot(a)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

// Indicators computes the technical indicator set for a symbol/timeframe.
func (m *MockMarketDataProvider) Indicators(symbol, timeframe string) (IndicatorSet, error) {
	meta, err := m.symbolIndex(symbol)
	if err != nil {
		return IndicatorSet{}, err
	}
	closes, highs, lows, volumes, err := m.series(meta, timeframe, 260)
	if err != nil {
		return IndicatorSet{}, err
	}
	return indicatorsFromCandles(closes, highs, lows, volumes), nil
}

// indicatorsFromCandles computes the full IndicatorSet from OHLCV series. It is
// shared by the mock and live providers so both produce identical math.
func indicatorsFromCandles(closes, highs, lows, volumes []float64) IndicatorSet {
	ind := IndicatorSet{}
	ind.RSI = rsi(closes, 14)
	ind.EMA20 = emaLast(closes, 20)
	ind.EMA50 = emaLast(closes, 50)
	ind.EMA200 = emaLast(closes, 200)
	ind.ATR = atr(highs, lows, closes, 14)
	ind.Stochastic = stochastic(closes, highs, lows, 14)
	ind.OBV = obv(closes, volumes)
	ind.Support = minRange(lows, 30)
	ind.Resistance = maxRange(highs, 30)

	macd, signal, hist := macdSeries(closes, 12, 26, 9)
	ind.MACD = macd
	ind.MACDSignal = signal
	ind.MACDHist = hist

	ind.Trend = trendLabel(lastOr(closes, 0), ind.EMA20, ind.EMA50, ind.RSI)
	ind.Momentum = momentumLabel(ind.RSI)
	return ind
}

func (m *MockMarketDataProvider) series(meta AssetMeta, timeframe string, count int) ([]float64, []float64, []float64, []float64, error) {
	candles, err := m.generateCandles(meta, timeframe, count)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	closes := make([]float64, len(candles))
	highs := make([]float64, len(candles))
	lows := make([]float64, len(candles))
	volumes := make([]float64, len(candles))
	for i, c := range candles {
		closes[i] = c.Close
		highs[i] = c.High
		lows[i] = c.Low
		volumes[i] = c.Volume
	}
	return closes, highs, lows, volumes, nil
}

// ---------------------------------------------------------------------------
// Global market structure
// ---------------------------------------------------------------------------

func (m *MockMarketDataProvider) GlobalMetrics() GlobalMetrics {
	rnd := m.rng("global", 7)
	totalCap := 2_300_000_000_000.0
	return GlobalMetrics{
		TotalMarketCap:     totalCap,
		MarketCapChange:    round((rnd.Float64()-0.42)*4, 2),
		TotalVolume:        170_000_000_000.0,
		VolumeChange:       round((rnd.Float64()-0.55)*8, 2),
		BTCDominance:       56.6,
		ETHDominance:       10.1,
		OtherDominance:     33.3,
		OpenInterest:       82_400_000_000.0,
		OpenInterestChange: round((rnd.Float64()-0.45)*5, 2),
		AltseasonIndex:     34.0,
		MarketIndex:        1284.6,
		MarketIndexChange:  round((rnd.Float64()-0.48)*3, 2),
		FearGreed:          68,
		FearGreedLabel:     "Greed",
	}
}

func (m *MockMarketDataProvider) Sentiment() (CompositeSentiment, error) {
	return CompositeSentiment{
		Composite: 68,
		Label:     "Risk-on",
		Drivers: map[string]any{
			"spotFlows":           map[string]any{"value": 72, "note": "Net buying across major venues"},
			"derivativesFunding":  map[string]any{"value": 58, "note": "Mildly long, no crowding"},
			"socialMomentum":      map[string]any{"value": 64, "note": "Mentions above 30d average"},
			"onChainAccumulation": map[string]any{"value": 81, "note": "Long-term holders adding"},
			"stablecoinSupply":    map[string]any{"value": 69, "note": "Expanding — dry powder rising"},
			"breadth":             map[string]any{"value": 41, "note": "Narrow, led by majors"},
		},
	}, nil
}

func (m *MockMarketDataProvider) FearGreedHistory(days int) ([]FearGreedPoint, error) {
	rnd := m.rng("fng", 3)
	points := make([]FearGreedPoint, 0, days)
	val := 55.0
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for i := days - 1; i >= 0; i-- {
		val += (rnd.Float64() - 0.5) * 14
		val = clamp(val, 8, 94)
		v := int(math.Round(val))
		points = append(points, FearGreedPoint{
			Date:  today.AddDate(0, 0, -i),
			Value: v,
			Label: fearGreedLabel(v),
		})
	}
	return points, nil
}

func (m *MockMarketDataProvider) DominanceHistory(days int) ([]DominancePoint, error) {
	rnd := m.rng("dom", 5)
	points := make([]DominancePoint, 0, days)
	btc := 52.0
	eth := 16.0
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for i := days - 1; i >= 0; i-- {
		btc += (rnd.Float64() - 0.45) * 0.5
		eth += (rnd.Float64() - 0.5) * 0.35
		btc = clamp(btc, 38, 70)
		eth = clamp(eth, 5, 30)
		other := 100 - btc - eth
		points = append(points, DominancePoint{Date: today.AddDate(0, 0, -i), BTC: round(btc, 1), ETH: round(eth, 1), Other: round(other, 1)})
	}
	return points, nil
}

func (m *MockMarketDataProvider) MarketCapHistory(days int) ([]HistoryPoint, error) {
	return m.historyWalk("mcap", days, 2_200_000_000_000.0, 1_900_000_000_000.0, 0.012)
}

func (m *MockMarketDataProvider) VolumeHistory(days int) ([]HistoryPoint, error) {
	return m.historyWalk("vol", days, 150_000_000_000.0, 60_000_000_000.0, 0.02)
}

func (m *MockMarketDataProvider) OpenInterestHistory(days int) ([]HistoryPoint, error) {
	return m.historyWalk("oi", days, 70_000_000_000.0, 30_000_000_000.0, 0.015)
}

func (m *MockMarketDataProvider) historyWalk(key string, days int, base, floor, vol float64) ([]HistoryPoint, error) {
	rnd := m.rng(key, 11)
	points := make([]HistoryPoint, 0, days)
	v := base
	today := time.Now().UTC().Truncate(24 * time.Hour)
	for i := days - 1; i >= 0; i-- {
		v += (rnd.Float64() - 0.5) * 2 * vol * base
		if v < floor {
			v = floor
		}
		points = append(points, HistoryPoint{Date: today.AddDate(0, 0, -i), Value: round(v, 0)})
	}
	return points, nil
}

// Heatmap returns the 24h performance tiles grouped by sector.
func (m *MockMarketDataProvider) Heatmap() ([]HeatmapCell, error) {
	snaps, err := m.Snapshots()
	if err != nil {
		return nil, err
	}
	cells := make([]HeatmapCell, 0, len(snaps))
	for _, s := range snaps {
		meta, _ := m.symbolIndex(s.Symbol)
		cells = append(cells, HeatmapCell{
			Symbol:    s.Symbol,
			Name:      meta.Name,
			Sector:    meta.Sector,
			Change24h: s.Change24h,
			MarketCap: s.MarketCap,
		})
	}
	return cells, nil
}

// ErrNotFound is returned when a symbol or timeframe does not exist.
var ErrNotFound = errors.New("not found")

// ---------------------------------------------------------------------------
// Indicator math (pure functions, unit-tested)
// ---------------------------------------------------------------------------

func pctChange(from, to float64) float64 {
	if from == 0 {
		return 0
	}
	return round((to-from)/from*100, 2)
}

func rsi(closes []float64, period int) float64 {
	if len(closes) < period+1 {
		return 50
	}
	var gains, losses float64
	for i := 1; i <= period; i++ {
		diff := closes[i] - closes[i-1]
		if diff >= 0 {
			gains += diff
		} else {
			losses -= diff
		}
	}
	avgGain := gains / float64(period)
	avgLoss := losses / float64(period)
	for i := period + 1; i < len(closes); i++ {
		diff := closes[i] - closes[i-1]
		g, l := 0.0, 0.0
		if diff >= 0 {
			g = diff
		} else {
			l = -diff
		}
		avgGain = (avgGain*float64(period-1) + g) / float64(period)
		avgLoss = (avgLoss*float64(period-1) + l) / float64(period)
	}
	if avgLoss == 0 {
		return 100
	}
	rs := avgGain / avgLoss
	return round(100-100/(1+rs), 2)
}

func emaSeries(closes []float64, period int) []float64 {
	if len(closes) == 0 {
		return nil
	}
	k := 2 / float64(period+1)
	out := make([]float64, len(closes))
	out[0] = closes[0]
	for i := 1; i < len(closes); i++ {
		out[i] = closes[i]*k + out[i-1]*(1-k)
	}
	return out
}

func emaLast(closes []float64, period int) float64 {
	if len(closes) < period {
		period = len(closes)
	}
	series := emaSeries(closes, period)
	if len(series) == 0 {
		return 0
	}
	return round(series[len(series)-1], 2)
}

func macdSeries(closes []float64, fast, slow, signal int) (float64, float64, float64) {
	if len(closes) < slow+signal {
		return 0, 0, 0
	}
	fastE := emaSeries(closes, fast)
	slowE := emaSeries(closes, slow)
	macdLine := make([]float64, len(closes))
	for i := range closes {
		macdLine[i] = fastE[i] - slowE[i]
	}
	sig := emaSeries(macdLine, signal)
	last := len(closes) - 1
	return round(macdLine[last], 4), round(sig[last], 4), round(macdLine[last]-sig[last], 4)
}

func trueRange(high, low, prevClose float64) float64 {
	a := high - low
	b := math.Abs(high - prevClose)
	c := math.Abs(low - prevClose)
	return math.Max(a, math.Max(b, c))
}

func atr(highs, lows, closes []float64, period int) float64 {
	if len(closes) < period+1 {
		return 0
	}
	var sum float64
	for i := 1; i <= period; i++ {
		sum += trueRange(highs[i], lows[i], closes[i-1])
	}
	return round(sum/float64(period), 2)
}

func stochastic(closes, highs, lows []float64, period int) float64 {
	n := len(closes)
	if n < period {
		return 50
	}
	var lowest, highest float64
	lowest, highest = lows[n-period], highs[n-period]
	for i := n - period + 1; i < n; i++ {
		if lows[i] < lowest {
			lowest = lows[i]
		}
		if highs[i] > highest {
			highest = highs[i]
		}
	}
	if highest == lowest {
		return 50
	}
	return round((closes[n-1]-lowest)/(highest-lowest)*100, 2)
}

func obv(closes, volumes []float64) float64 {
	var out float64
	for i := 1; i < len(closes); i++ {
		if closes[i] > closes[i-1] {
			out += volumes[i]
		} else if closes[i] < closes[i-1] {
			out -= volumes[i]
		}
	}
	return round(out, 0)
}

func minRange(values []float64, n int) float64 {
	if len(values) == 0 {
		return 0
	}
	if n > len(values) {
		n = len(values)
	}
	min := values[len(values)-n]
	for _, v := range values[len(values)-n:] {
		if v < min {
			min = v
		}
	}
	return round(min, 8)
}

func maxRange(values []float64, n int) float64 {
	if len(values) == 0 {
		return 0
	}
	if n > len(values) {
		n = len(values)
	}
	max := values[len(values)-n]
	for _, v := range values[len(values)-n:] {
		if v > max {
			max = v
		}
	}
	return round(max, 8)
}

func trendLabel(close, ema20, ema50, rsiValue float64) string {
	if rsiValue >= 68 && close >= ema20 {
		return "Strong Bullish"
	}
	if rsiValue <= 32 && close <= ema20 {
		return "Strong Bearish"
	}
	if close > ema50 {
		return "Bullish"
	}
	if close < ema50 {
		return "Bearish"
	}
	return "Neutral"
}

func momentumLabel(rsiValue float64) string {
	switch {
	case rsiValue >= 65:
		return "Strong"
	case rsiValue >= 52:
		return "Moderate"
	case rsiValue >= 40:
		return "Weak"
	default:
		return "Oversold"
	}
}

func fearGreedLabel(v int) string {
	switch {
	case v >= 75:
		return "Extreme Greed"
	case v >= 55:
		return "Greed"
	case v >= 45:
		return "Neutral"
	case v >= 25:
		return "Fear"
	default:
		return "Extreme Fear"
	}
}

func lastOr(v []float64, fallback float64) float64 {
	if len(v) == 0 {
		return fallback
	}
	return v[len(v)-1]
}

func clamp(v, lo, hi float64) float64 {
	return math.Max(lo, math.Min(hi, v))
}

func round(v float64, places int) float64 {
	p := math.Pow(10, float64(places))
	return math.Round(v*p) / p
}
