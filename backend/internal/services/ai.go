package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"cryptolytic/backend/internal/marketdata"
	"cryptolytic/backend/internal/models"
	"cryptolytic/backend/internal/repositories"
)

// AIService builds structured technical analysis from the market data provider.
// It is intentionally rule-based so it works offline with the mock provider;
// the same input contract can be forwarded to a real LLM later.
type AIService struct {
	pool     *pgxpool.Pool
	provider marketdata.MarketDataProvider
	market   *repositories.MarketRepo
}

func NewAIService(pool *pgxpool.Pool, provider marketdata.MarketDataProvider, market *repositories.MarketRepo) *AIService {
	return &AIService{pool: pool, provider: provider, market: market}
}

type AnalyzeRequest struct {
	Symbol    string `json:"symbol" validate:"required,uppercase"`
	Timeframe string `json:"timeframe" validate:"required,oneof=1m 5m 15m 30m 1h 4h 1d 1w"`
}

// Analyze gathers OHLCV + indicators + sentiment and returns a structured,
// deterministic analysis. The output explicitly contains no guarantees.
func (s *AIService) Analyze(ctx context.Context, userID string, req AnalyzeRequest) (*models.AIAnalysis, error) {
	candles, err := s.provider.Candles(req.Symbol, req.Timeframe, 80)
	if err != nil {
		return nil, err
	}
	ind, err := s.provider.Indicators(req.Symbol, req.Timeframe)
	if err != nil {
		return nil, err
	}
	snap, err := s.provider.Snapshot(req.Symbol)
	if err != nil {
		return nil, err
	}
	sentiment, err := s.provider.Sentiment()
	if err != nil {
		return nil, err
	}

	input := map[string]any{
		"symbol":    req.Symbol,
		"timeframe": req.Timeframe,
		"ohlcv":     summarizeCandles(candles),
		"indicators": map[string]any{
			"rsi": ind.RSI, "macd": ind.MACD, "macdSignal": ind.MACDSignal, "macdHist": ind.MACDHist,
			"ema20": ind.EMA20, "ema50": ind.EMA50, "ema200": ind.EMA200, "atr": ind.ATR,
			"stochastic": ind.Stochastic, "obv": ind.OBV,
		},
		"support": ind.Support, "resistance": ind.Resistance,
		"marketStructure": structure(candles),
		"sentiment":       map[string]any{"composite": sentiment.Composite, "label": sentiment.Label},
		"requestedAt":     time.Now().UTC().Format(time.RFC3339),
	}

	output := buildAnalysis(req.Symbol, req.Timeframe, candles, ind, snap, sentiment.Composite)

	analysis := &models.AIAnalysis{
		ID:        uuid.NewString(),
		UserID:    userID,
		Symbol:    req.Symbol,
		Timeframe: req.Timeframe,
		Input:     input,
		Output:    output,
		Model:     "cryptolytic-rules-v1",
	}
	if err := s.insert(ctx, analysis); err != nil {
		return nil, err
	}
	return analysis, nil
}

func (s *AIService) insert(ctx context.Context, a *models.AIAnalysis) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO ai_analyses (id, user_id, symbol, timeframe, input, output, model)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		a.ID, a.UserID, a.Symbol, a.Timeframe, a.Input, a.Output, a.Model)
	if err != nil {
		return fmt.Errorf("insert ai analysis: %w", err)
	}
	return nil
}

func (s *AIService) ListByUser(ctx context.Context, userID string) ([]models.AIAnalysis, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, symbol, timeframe, input, output, model, created_at, updated_at
		FROM ai_analyses WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list ai analyses: %w", err)
	}
	defer rows.Close()

	out := []models.AIAnalysis{}
	for rows.Next() {
		var a models.AIAnalysis
		if err := rows.Scan(&a.ID, &a.UserID, &a.Symbol, &a.Timeframe, &a.Input, &a.Output, &a.Model, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan ai analysis: %w", err)
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *AIService) GetByID(ctx context.Context, id, userID string) (*models.AIAnalysis, error) {
	var a models.AIAnalysis
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id, symbol, timeframe, input, output, model, created_at, updated_at
		FROM ai_analyses WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&a.ID, &a.UserID, &a.Symbol, &a.Timeframe, &a.Input, &a.Output, &a.Model, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, repositories.ErrNotFound
	}
	return &a, nil
}

// ---------------------------------------------------------------------------
// Rule-based output
// ---------------------------------------------------------------------------

func buildAnalysis(symbol, timeframe string, candles []marketdata.Candle, ind marketdata.IndicatorSet, snap marketdata.Snapshot, sentiment int) map[string]any {
	bias := "neutral"
	switch {
	case ind.RSI >= 60 && ind.MACDHist > 0 && snap.Price >= ind.EMA50:
		bias = "bullish"
	case ind.RSI <= 40 && ind.MACDHist < 0 && snap.Price <= ind.EMA50:
		bias = "bearish"
	}

	keyLevels := map[string]any{
		"support":    ind.Support,
		"resistance": ind.Resistance,
		"pivot":      round2((ind.Support + ind.Resistance) / 2),
	}

	last := candles[len(candles)-1]
	summary := fmt.Sprintf(
		"%s is trading at %s on the %s chart. RSI is %.1f, MACD histogram is %s, and price sits %s the 50-EMA (%s).",
		symbol, formatPrice(snap.Price), timeframe, ind.RSI,
		signText(ind.MACDHist), aboveBelow(snap.Price, ind.EMA50), formatPrice(ind.EMA50),
	)

	return map[string]any{
		"symbol":     symbol,
		"timeframe":  timeframe,
		"bias":       bias,
		"confidence": confidenceText(ind.RSI, snap.Change24h),
		"summary":    summary,
		"keyLevels":  keyLevels,
		"momentum":   map[string]any{"rsi": ind.RSI, "stochastic": ind.Stochastic, "label": ind.Momentum},
		"trend":      ind.Trend,
		"volume24h":  snap.Volume24h,
		"lastClose":  last.Close,
		"atr":        ind.ATR,
		"marketContext": map[string]any{
			"sentiment": sentiment,
			"change24h": snap.Change24h,
		},
		"disclaimer":  "This is algorithmic market analysis for research and education only. It is not financial advice and does not guarantee any outcome.",
		"generatedAt": time.Now().UTC().Format(time.RFC3339),
	}
}

func summarizeCandles(candles []marketdata.Candle) []map[string]any {
	step := 1
	if len(candles) > 60 {
		step = 2
	}
	out := make([]map[string]any, 0, len(candles)/step)
	for i := 0; i < len(candles); i += step {
		c := candles[i]
		out = append(out, map[string]any{
			"t": time.Unix(c.Timestamp, 0).UTC().Format(time.RFC3339),
			"o": c.Open, "h": c.High, "l": c.Low, "c": c.Close, "v": c.Volume,
		})
	}
	return out
}

func structure(candles []marketdata.Candle) string {
	if len(candles) < 20 {
		return "insufficient data"
	}
	// Compare swing highs/lows of the first half vs the second half.
	mid := len(candles) / 2
	highA, lowA := swingRange(candles[:mid])
	highB, lowB := swingRange(candles[mid:])
	switch {
	case highB > highA && lowB > lowA:
		return "Higher High / Higher Low (uptrend)"
	case highB < highA && lowB < lowA:
		return "Lower High / Lower Low (downtrend)"
	case highB > highA && lowB < lowA:
		return "Expanding range (volatile)"
	default:
		return "Ranging / sideways"
	}
}

func swingRange(c []marketdata.Candle) (high, low float64) {
	high, low = c[0].High, c[0].Low
	for _, x := range c {
		if x.High > high {
			high = x.High
		}
		if x.Low < low {
			low = x.Low
		}
	}
	return high, low
}

func formatPrice(v float64) string {
	switch {
	case v >= 1000:
		return "$" + trimZeros(fmt.Sprintf("%.2f", v))
	case v >= 1:
		return "$" + trimZeros(fmt.Sprintf("%.3f", v))
	case v >= 0.001:
		return "$" + trimZeros(fmt.Sprintf("%.5f", v))
	default:
		return "$" + trimZeros(fmt.Sprintf("%.8f", v))
	}
}

func trimZeros(s string) string {
	return strings.TrimRight(strings.TrimRight(s, "0"), ".")
}

func signText(v float64) string {
	if v > 0 {
		return "positive"
	}
	if v < 0 {
		return "negative"
	}
	return "flat"
}

func aboveBelow(price, ema float64) string {
	if price >= ema {
		return "above"
	}
	return "below"
}

func confidenceText(rsiValue, change24h float64) string {
	strength := 0
	if rsiValue >= 55 || rsiValue <= 45 {
		strength++
	}
	if change24h > 1 || change24h < -1 {
		strength++
	}
	switch strength {
	case 2:
		return "moderate-high"
	case 1:
		return "moderate"
	default:
		return "low"
	}
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
