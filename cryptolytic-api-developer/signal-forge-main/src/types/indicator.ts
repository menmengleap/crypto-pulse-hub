/** Core domain types mirroring the Cryptolutic Indicator API contract. */

export const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorParams = Record<string, number>;

export type IndicatorType = "sma" | "ema" | "rsi" | "macd" | "bbands" | "atr" | "adx";

export interface IndicatorConfig {
  type: IndicatorType;
  params: IndicatorParams;
}

export interface IndicatorRequest {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  indicators: IndicatorConfig[];
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export type IndicatorLine = IndicatorPoint[];

export interface IndicatorResult {
  type: string;
  params: IndicatorParams;
  lines: Record<string, IndicatorLine>;
}

export interface IndicatorResponse {
  symbol: string;
  timeframe: string;
  computedAt: string;
  results: IndicatorResult[];
}

export interface APIError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface APIKey {
  id: string;
  name: string;
  maskedKey: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
}

export interface UsagePoint {
  time: string;
  requests?: number;
  errors?: number;
  latencyMs?: number;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  rateLimit?: { limit: number; remaining: number; window: string };
  activeKeys?: number;
  series?: UsagePoint[];
}
