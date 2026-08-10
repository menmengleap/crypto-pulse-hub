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
  interpretation: string;
}

/** Only indicators the calculation engine supports are exposed anywhere in the UI. */
export const INDICATORS: IndicatorMeta[] = [
  {
    type: "sma",
    slug: "sma",
    name: "Simple Moving Average",
    short: "SMA",
    category: "Trend",
    description:
      "Arithmetic mean of closing prices over a fixed lookback period. Smooths price noise into a single trend line.",
    params: [{ key: "period", label: "Period", default: 20, min: 1, max: 1000 }],
    lines: ["sma"],
    interpretation:
      "Returns one line. Values are undefined for the first period - 1 candles, so the series is shorter than the candle input.",
  },
  {
    type: "ema",
    slug: "ema",
    name: "Exponential Moving Average",
    short: "EMA",
    category: "Trend",
    description:
      "Weighted moving average that reacts faster to recent price action than a simple moving average.",
    params: [{ key: "period", label: "Period", default: 21, min: 1, max: 1000 }],
    lines: ["ema"],
    interpretation: "Returns one line with the same timestamps as the trailing candles.",
  },
  {
    type: "rsi",
    slug: "rsi",
    name: "Relative Strength Index",
    short: "RSI",
    category: "Momentum",
    description:
      "Momentum oscillator bounded between 0 and 100 comparing average gains to average losses over the period.",
    params: [{ key: "period", label: "Period", default: 14, min: 2, max: 1000 }],
    lines: ["rsi"],
    interpretation:
      "Returns one bounded line. Conventional readings treat 70 as overbought and 30 as oversold — interpretation is left to your application.",
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
      { key: "fast", label: "Fast", default: 12, min: 1, max: 1000 },
      { key: "slow", label: "Slow", default: 26, min: 1, max: 1000 },
      { key: "signal", label: "Signal", default: 9, min: 1, max: 1000 },
    ],
    lines: ["macd", "signal", "histogram"],
    interpretation: "Returns three lines: macd, signal and histogram.",
  },
  {
    type: "bbands",
    slug: "bbands",
    name: "Bollinger Bands",
    short: "Bollinger Bands",
    category: "Volatility",
    description:
      "A moving average with upper and lower bands offset by a multiple of the standard deviation of price.",
    params: [
      { key: "period", label: "Period", default: 20, min: 2, max: 1000 },
      { key: "stddev", label: "Std Dev", default: 2, min: 1, max: 10, step: 0.1 },
    ],
    lines: ["upper", "middle", "lower"],
    interpretation: "Returns three lines: upper, middle and lower.",
  },
  {
    type: "atr",
    slug: "atr",
    name: "Average True Range",
    short: "ATR",
    category: "Volatility",
    description:
      "Average of true ranges over the period, measuring absolute volatility in the instrument's own units.",
    params: [{ key: "period", label: "Period", default: 14, min: 1, max: 1000 }],
    lines: ["atr"],
    interpretation: "Returns one line expressed in price units, never normalised.",
  },
  {
    type: "adx",
    slug: "adx",
    name: "Average Directional Index",
    short: "ADX",
    category: "Trend",
    description:
      "Quantifies trend strength independent of direction, derived from smoothed directional movement.",
    params: [{ key: "period", label: "Period", default: 14, min: 2, max: 1000 }],
    lines: ["adx"],
    interpretation: "Returns one line bounded between 0 and 100 describing trend strength only.",
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
        issues.push({ scope: "candles", row: index, message: `Row ${index + 1}: ${field} must be a finite number.` });
      }
    }
    if (seen.has(candle.time)) {
      issues.push({ scope: "candles", row: index, message: `Row ${index + 1}: duplicate timestamp ${candle.time}.` });
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
      issues.push({ scope: "indicators", row: index, message: `Unsupported indicator "${indicator.type}".` });
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
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { candles?: unknown }).candles)
      ? ((parsed as { candles: unknown[] }).candles as unknown[])
      : null;
  if (!list) return { candles: [], error: "Expected an array of candles or an object with a candles array." };

  const candles: Candle[] = [];
  for (const raw of list) {
    if (typeof raw !== "object" || raw === null) return { candles: [], error: "Each candle must be an object." };
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
