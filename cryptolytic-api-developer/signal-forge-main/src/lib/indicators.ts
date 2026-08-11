import type { Candle, IndicatorConfig, IndicatorRequest, IndicatorType } from "@/types/indicator";
import { LIMITS } from "./api/config";

export interface ParamSpec {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step?: number;
}

export interface IndicatorMeta {
  type: IndicatorType;
  slug: string;
  name: string;
  short: string;
  description: string;
  category: "Trend" | "Momentum" | "Volatility";
  params: ParamSpec[];
  lines: string[];
  formula?: string;
  warmup?: string;
  interpretation: string;
}

/**
 * The indicator catalog — kept in lockstep with the Python engine
 * (python-indicators/app/indicators.py) and the Go gateway catalog
 * (backend/internal/indicators/catalog.go). Every type, param key, default
 * and bound below matches what the calculation service actually validates.
 */
export const INDICATORS: IndicatorMeta[] = [
  {
    type: "sma",
    slug: "sma",
    name: "Simple Moving Average",
    short: "SMA",
    category: "Trend",
    description:
      "Arithmetic mean of closing prices over a fixed lookback period. Smooths price noise into a single trend line.",
    params: [{ key: "period", label: "Period", default: 20, min: 2, max: 500 }],
    lines: ["sma"],
    formula: "sma(t) = mean(close[t − period + 1 … t])",
    warmup: "The first period − 1 values are undefined and omitted from the response.",
    interpretation:
      "Returns one line. Price above the average leans bullish, below leans bearish — interpretation is left to your application.",
  },
  {
    type: "ema",
    slug: "ema",
    name: "Exponential Moving Average",
    short: "EMA",
    category: "Trend",
    description:
      "Weighted moving average (alpha = 2/(period+1)) that reacts faster to recent price action than a simple moving average.",
    params: [{ key: "period", label: "Period", default: 20, min: 2, max: 500 }],
    lines: ["ema"],
    formula: "ema(t) = α·close(t) + (1 − α)·ema(t−1),  α = 2/(period+1)",
    warmup: "Seeded from the first close; earlier values converge as the series warms up.",
    interpretation: "Returns one line with the same timestamps as the trailing candles.",
  },
  {
    type: "rsi",
    slug: "rsi",
    name: "Relative Strength Index",
    short: "RSI",
    category: "Momentum",
    description:
      "Momentum oscillator bounded between 0 and 100 comparing average gains to average losses over the period (Wilder smoothing).",
    params: [{ key: "period", label: "Period", default: 14, min: 2, max: 250 }],
    lines: ["rsi"],
    formula: "rsi = 100 − 100/(1 + RS),  RS = avg_gain / avg_loss (Wilder alpha = 1/period)",
    warmup: "The first period values are unreliable warm-up and are dropped.",
    interpretation:
      "Returns one bounded line. Conventional readings treat 70 as overbought and 30 as oversold; a flat market reads 50.",
  },
  {
    type: "macd",
    slug: "macd",
    name: "Moving Average Convergence Divergence",
    short: "MACD",
    category: "Momentum",
    description:
      "Difference between a fast and slow EMA, plus a signal EMA of that difference and the resulting histogram.",
    params: [
      { key: "fast", label: "Fast", default: 12, min: 2, max: 200 },
      { key: "slow", label: "Slow", default: 26, min: 3, max: 300 },
      { key: "signal", label: "Signal", default: 9, min: 2, max: 100 },
    ],
    lines: ["macd", "signal", "histogram"],
    formula: "macd = ema(fast) − ema(slow); signal = ema(macd, signal); histogram = macd − signal",
    warmup: "Both EMAs seed from the first close, so the first slow bars are masked as warm-up.",
    interpretation:
      "Returns three lines: macd, signal and histogram. Crossovers of macd and signal are the classic trade signal.",
  },
  {
    type: "bollinger",
    slug: "bollinger",
    name: "Bollinger Bands",
    short: "Bollinger",
    category: "Volatility",
    description:
      "A moving average with upper and lower bands offset by a multiple of the population standard deviation of price.",
    params: [
      { key: "period", label: "Period", default: 20, min: 2, max: 500 },
      { key: "stdDev", label: "Std Dev", default: 2, min: 0.1, max: 10, step: 0.1 },
    ],
    lines: ["upper", "middle", "lower"],
    formula: "middle = sma(period); bands = middle ± stdDev · population_std(period)",
    warmup: "Values are undefined for the first period − 1 candles.",
    interpretation:
      "Returns three lines: upper, middle and lower. Band width reflects volatility; squeezes and expansions signal consolidation and breakouts.",
  },
  {
    type: "atr",
    slug: "atr",
    name: "Average True Range",
    short: "ATR",
    category: "Volatility",
    description:
      "Wilder-smoothed mean of the true range, measuring absolute volatility in the instrument's own units.",
    params: [{ key: "period", label: "Period", default: 14, min: 2, max: 250 }],
    lines: ["atr"],
    formula:
      "tr = max(high−low, |high−prev_close|, |low−prev_close|); atr = ewm(tr, alpha=1/period)",
    warmup: "The first period values converge as the Wilder smoothing warms up.",
    interpretation:
      "Returns one line expressed in price units, never normalised — useful for position sizing and stop distances.",
  },
  {
    type: "stochastic",
    slug: "stochastic",
    name: "Stochastic Oscillator",
    short: "Stoch",
    category: "Momentum",
    description:
      "Oscillator comparing the close to the rolling high/low range, with %K and %D smoothing. Bounded between 0 and 100.",
    params: [
      { key: "period", label: "Period", default: 14, min: 2, max: 250 },
      { key: "smoothK", label: "%K Smooth", default: 3, min: 1, max: 50 },
      { key: "smoothD", label: "%D Smooth", default: 3, min: 1, max: 50 },
    ],
    lines: ["k", "d"],
    formula: "%K = 100·(close − lowest_low)/(highest_high − lowest_low), smoothed; %D = mean(%K)",
    warmup: "Windows with zero range are NaN and omitted from the response.",
    interpretation:
      "Returns two lines: %K and %D. Conventional readings treat 80 as overbought and 20 as oversold.",
  },
  {
    type: "obv",
    slug: "obv",
    name: "On-Balance Volume",
    short: "OBV",
    category: "Momentum",
    description:
      "Cumulative volume signed by the close-to-close direction — a running tally that pairs price movement with volume flow.",
    params: [],
    lines: ["obv"],
    formula: "obv(t) = obv(t−1) + sign(close(t) − close(t−1)) · volume(t)",
    warmup: "No warm-up: the series starts at the first candle.",
    interpretation:
      "Returns one cumulative line with no parameters. Divergence between price and OBV can hint at weakening volume behind a move.",
  },
];

export const INDICATOR_MAP: Record<string, IndicatorMeta> = Object.fromEntries(
  INDICATORS.map((indicator) => [indicator.type, indicator]),
);

export function defaultConfig(type: IndicatorType): IndicatorConfig {
  const meta = INDICATOR_MAP[type];
  return {
    type,
    params: Object.fromEntries((meta?.params ?? []).map((p) => [p.key, p.default])),
  };
}

export interface ValidationIssue {
  scope: "candles" | "indicators" | "symbol" | "body";
  row?: number;
  message: string;
}

/** Mirrors the documented server-side validation so users see problems before sending. */
export function validateRequest(request: IndicatorRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { candles, indicators, symbol } = request;

  if (!symbol.trim()) issues.push({ scope: "symbol", message: "Symbol is required." });

  if (candles.length < LIMITS.minCandles) {
    issues.push({
      scope: "candles",
      message: `At least ${LIMITS.minCandles} candles are required (currently ${candles.length}).`,
    });
  }
  if (candles.length > LIMITS.maxCandles) {
    issues.push({
      scope: "candles",
      message: `A maximum of ${LIMITS.maxCandles} candles is allowed (currently ${candles.length}).`,
    });
  }

  const seen = new Set<number>();
  candles.forEach((candle, index) => {
    const numbers: [keyof Candle, number][] = [
      ["time", candle.time],
      ["open", candle.open],
      ["high", candle.high],
      ["low", candle.low],
      ["close", candle.close],
      ["volume", candle.volume],
    ];
    for (const [field, value] of numbers) {
      if (!Number.isFinite(value)) {
        issues.push({
          scope: "candles",
          row: index,
          message: `Row ${index + 1}: ${field} must be a finite number.`,
        });
      }
    }
    if (seen.has(candle.time)) {
      issues.push({
        scope: "candles",
        row: index,
        message: `Row ${index + 1}: duplicate timestamp ${candle.time}.`,
      });
    }
    seen.add(candle.time);
    const prev = candles[index - 1];
    if (prev && candle.time <= prev.time) {
      issues.push({
        scope: "candles",
        row: index,
        message: `Row ${index + 1}: timestamps must be strictly ascending.`,
      });
    }
  });

  if (indicators.length < LIMITS.minIndicators) {
    issues.push({ scope: "indicators", message: "At least 1 indicator is required." });
  }
  if (indicators.length > LIMITS.maxIndicators) {
    issues.push({
      scope: "indicators",
      message: `A maximum of ${LIMITS.maxIndicators} indicators is allowed per request.`,
    });
  }
  indicators.forEach((indicator, index) => {
    const meta = INDICATOR_MAP[indicator.type];
    if (!meta) {
      issues.push({
        scope: "indicators",
        row: index,
        message: `Unsupported indicator "${indicator.type}".`,
      });
      return;
    }
    for (const spec of meta.params) {
      const value = indicator.params[spec.key] ?? Number.NaN;
      if (!Number.isFinite(value)) {
        issues.push({
          scope: "indicators",
          row: index,
          message: `${meta.short}: ${spec.label} must be a finite number.`,
        });
      } else if (value < spec.min || value > spec.max) {
        issues.push({
          scope: "indicators",
          row: index,
          message: `${meta.short}: ${spec.label} must be between ${spec.min} and ${spec.max}.`,
        });
      }
    }
  });

  const bytes = requestBytes(request);
  if (bytes > LIMITS.maxBodyBytes) {
    issues.push({
      scope: "body",
      message: `Request body is ${(bytes / 1024 / 1024).toFixed(2)} MB — the maximum is 2 MB.`,
    });
  }

  return issues;
}

export function requestBytes(request: IndicatorRequest): number {
  const json = JSON.stringify(request);
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(json).length;
  return json.length;
}

export function parseCandles(input: string): { candles: Candle[]; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { candles: [], error: "Input is not valid JSON." };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { candles?: unknown }).candles)
      ? ((parsed as { candles: unknown[] }).candles as unknown[])
      : null;
  if (!list)
    return {
      candles: [],
      error: "Expected an array of candles or an object with a candles array.",
    };

  const candles: Candle[] = [];
  for (const raw of list) {
    if (typeof raw !== "object" || raw === null)
      return { candles: [], error: "Each candle must be an object." };
    const item = raw as Record<string, unknown>;
    const candle: Candle = {
      time: Number(item["time"]),
      open: Number(item["open"]),
      high: Number(item["high"]),
      low: Number(item["low"]),
      close: Number(item["close"]),
      volume: Number(item["volume"]),
    };
    candles.push(candle);
  }
  return { candles };
}
