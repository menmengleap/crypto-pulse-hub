package indicators

// Catalog metadata for every indicator the Python microservice
// (python-indicators/app/indicators.py) can compute. This is the developer-facing
// contract served by GET /api/v1/indicators — kept in lockstep with the Python
// implementations (same types, params, bounds, lines and warm-up behaviour).
//
// When an indicator is added to python-indicators, it must be added here too,
// otherwise the catalog (and the frontend pages built on it) drift from the
// engine.

// ParamSpec describes one configurable parameter of an indicator.
type ParamSpec struct {
	Key     string  `json:"key"`
	Label   string  `json:"label"`
	Default float64 `json:"default"`
	Min     float64 `json:"min"`
	Max     float64 `json:"max"`
	Step    float64 `json:"step,omitempty"`
}

// Indicator is the full developer-facing description of one indicator.
type Indicator struct {
	Type           string      `json:"type"`
	Name           string      `json:"name"`
	Short          string      `json:"short"`
	Category       string      `json:"category"` // Trend | Momentum | Volatility
	Description    string      `json:"description"`
	Params         []ParamSpec `json:"params"`
	Lines          []string    `json:"lines"`
	Formula        string      `json:"formula,omitempty"`
	Warmup         string      `json:"warmup,omitempty"`
	Interpretation string      `json:"interpretation"`
}

// Limits are the request-shape constraints enforced by the gateway (mirrors
// python-indicators/app/schemas.py plus the gateway's own caps).
type Limits struct {
	MinCandles    int `json:"minCandles"`
	MaxCandles    int `json:"maxCandles"`
	MinIndicators int `json:"minIndicators"`
	MaxIndicators int `json:"maxIndicators"`
}

// Timeframes are the valid timeframe values accepted by the calculate API.
var Timeframes = []string{"1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"}

// Catalog is the full response of GET /api/v1/indicators.
type Catalog struct {
	Indicators []Indicator `json:"indicators"`
	Timeframes []string    `json:"timeframes"`
	Limits     Limits      `json:"limits"`
}

// catalog lists every indicator implemented in python-indicators.
var catalog = []Indicator{
	{
		Type:     "sma",
		Name:     "Simple Moving Average",
		Short:    "SMA",
		Category: "Trend",
		Description: "Arithmetic mean of closing prices over a fixed lookback period. " +
			"Smooths price noise into a single trend line.",
		Params: []ParamSpec{{Key: "period", Label: "Period", Default: 20, Min: 2, Max: 500}},
		Lines:  []string{"sma"},
		Formula: "sma(t) = mean(close[t-period+1 .. t])",
		Warmup:  "The first period - 1 values are undefined and omitted from the response.",
		Interpretation: "Returns one line. Values below the moving average suggest " +
			"downtrend pressure and values above suggest uptrend support — interpretation is left to your application.",
	},
	{
		Type:     "ema",
		Name:     "Exponential Moving Average",
		Short:    "EMA",
		Category: "Trend",
		Description: "Weighted moving average (alpha = 2/(period+1)) that reacts " +
			"faster to recent price action than a simple moving average.",
		Params: []ParamSpec{{Key: "period", Label: "Period", Default: 20, Min: 2, Max: 500}},
		Lines:  []string{"ema"},
		Formula: "ema(t) = alpha·close(t) + (1 - alpha)·ema(t-1),  alpha = 2/(period+1)",
		Warmup:  "Seeded from the first close; earlier values converge as the series warms up.",
		Interpretation: "Returns one line with the same timestamps as the trailing candles.",
	},
	{
		Type:     "rsi",
		Name:     "Relative Strength Index",
		Short:    "RSI",
		Category: "Momentum",
		Description: "Momentum oscillator bounded between 0 and 100 comparing " +
			"average gains to average losses over the period (Wilder smoothing).",
		Params: []ParamSpec{{Key: "period", Label: "Period", Default: 14, Min: 2, Max: 250}},
		Lines:  []string{"rsi"},
		Formula: "rsi = 100 - 100/(1 + RS),  RS = avg_gain / avg_loss (Wilder alpha = 1/period)",
		Warmup:  "The first period values are unreliable warm-up and are dropped.",
		Interpretation: "Returns one bounded line. Conventional readings treat 70 as " +
			"overbought and 30 as oversold; a flat market reads 50.",
	},
	{
		Type:     "macd",
		Name:     "Moving Average Convergence Divergence",
		Short:    "MACD",
		Category: "Momentum",
		Description: "Difference between a fast and slow EMA, plus a signal EMA of " +
			"that difference and the resulting histogram.",
		Params: []ParamSpec{
			{Key: "fast", Label: "Fast", Default: 12, Min: 2, Max: 200},
			{Key: "slow", Label: "Slow", Default: 26, Min: 3, Max: 300},
			{Key: "signal", Label: "Signal", Default: 9, Min: 2, Max: 100},
		},
		Lines: []string{"macd", "signal", "histogram"},
		Formula: "macd = ema(fast) - ema(slow); signal = ema(macd, signal); histogram = macd - signal",
		Warmup:  "Both EMAs seed from the first close, so the first slow bars are masked as warm-up.",
		Interpretation: "Returns three lines: macd, signal and histogram. Crossovers of " +
			"macd and signal are the classic trade signal.",
	},
	{
		Type:     "bollinger",
		Name:     "Bollinger Bands",
		Short:    "Bollinger",
		Category: "Volatility",
		Description: "A moving average with upper and lower bands offset by a " +
			"multiple of the population standard deviation of price.",
		Params: []ParamSpec{
			{Key: "period", Label: "Period", Default: 20, Min: 2, Max: 500},
			{Key: "stdDev", Label: "Std Dev", Default: 2, Min: 0.1, Max: 10, Step: 0.1},
		},
		Lines: []string{"upper", "middle", "lower"},
		Formula: "middle = sma(period); bands = middle ± stdDev · population_std(period)",
		Warmup:  "Values are undefined for the first period - 1 candles.",
		Interpretation: "Returns three lines: upper, middle and lower. Band width reflects " +
			"volatility; squeezes and expansions signal consolidation and breakouts.",
	},
	{
		Type:     "atr",
		Name:     "Average True Range",
		Short:    "ATR",
		Category: "Volatility",
		Description: "Wilder-smoothed mean of the true range, measuring absolute " +
			"volatility in the instrument's own units.",
		Params: []ParamSpec{{Key: "period", Label: "Period", Default: 14, Min: 2, Max: 250}},
		Lines:  []string{"atr"},
		Formula: "tr = max(high-low, |high-prev_close|, |low-prev_close|); atr = ewm(tr, alpha=1/period)",
		Warmup:  "The first period values converge as the Wilder smoothing warms up.",
		Interpretation: "Returns one line expressed in price units, never normalised — " +
			"useful for position sizing and stop distances.",
	},
	{
		Type:     "stochastic",
		Name:     "Stochastic Oscillator",
		Short:    "Stoch",
		Category: "Momentum",
		Description: "Oscillator comparing the close to the rolling high/low range, " +
			"with %K and %D smoothing. Bounded between 0 and 100.",
		Params: []ParamSpec{
			{Key: "period", Label: "Period", Default: 14, Min: 2, Max: 250},
			{Key: "smoothK", Label: "%K Smooth", Default: 3, Min: 1, Max: 50},
			{Key: "smoothD", Label: "%D Smooth", Default: 3, Min: 1, Max: 50},
		},
		Lines: []string{"k", "d"},
		Formula: "%K = 100·(close - lowest_low)/(highest_high - lowest_low), smoothed; %D = mean(%K)",
		Warmup:  "Windows with zero range are NaN and omitted from the response.",
		Interpretation: "Returns two lines: %K and %D. Conventional readings treat 80 as " +
			"overbought and 20 as oversold.",
	},
	{
		Type:     "obv",
		Name:     "On-Balance Volume",
		Short:    "OBV",
		Category: "Momentum",
		Description: "Cumulative volume signed by the close-to-close direction — a " +
			"running tally that pairs price movement with volume flow.",
		Params: []ParamSpec{},
		Lines:  []string{"obv"},
		Formula: "obv(t) = obv(t-1) + sign(close(t) - close(t-1)) · volume(t)",
		Warmup:  "No warm-up: the series starts at the first candle.",
		Interpretation: "Returns one cumulative line with no parameters. Divergence between " +
			"price and OBV can hint at weakening volume behind a move.",
	},
}

// List returns the indicator catalog served by GET /api/v1/indicators.
func List() *Catalog {
	return &Catalog{
		Indicators: catalog,
		Timeframes: Timeframes,
		Limits: Limits{
			MinCandles:    5,
			MaxCandles:    5000,
			MinIndicators: 1,
			MaxIndicators: 12,
		},
	}
}
