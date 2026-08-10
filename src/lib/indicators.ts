import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Candle } from "./realtime";

/**
 * Technical indicator layer.
 *
 * Data flow: React → Go gateway (POST /api/indicators/calculate) → Python
 * microservice. The browser never talks to the Python service directly, and
 * the Go gateway returns a clean 503 when the service is unreachable, so the
 * chart degrades gracefully (candles only) instead of showing wrong data.
 */

/** Indicator families the Python microservice understands. */
export type IndicatorType =
  "sma" | "ema" | "rsi" | "macd" | "bollinger" | "atr" | "stochastic" | "obv";

/** One value of an indicator series (warm-up values are already dropped). */
export type IndicatorPoint = { time: number; value: number };

export type IndicatorSpec = { type: IndicatorType; params: Record<string, number> };

/** One computed indicator: a label → series map (e.g. { macd, signal, histogram }). */
export type IndicatorResult = {
  type: IndicatorType;
  params: Record<string, number>;
  lines: Record<string, IndicatorPoint[]>;
};

/** Response of the Go gateway (passthrough of the Python service response). */
export type IndicatorResponse = {
  symbol: string;
  timeframe: string;
  computedAt: string;
  results: IndicatorResult[];
};

/** A selectable chart indicator for the UI catalog. */
export type IndicatorPreset = {
  key: string;
  label: string;
  /** overlay = drawn on the price scale; pane = own sub-chart below price. */
  kind: "overlay" | "pane";
  /** price-scale id for pane indicators (each pane gets its own band). */
  paneId?: string;
  spec: IndicatorSpec;
  /** per-line colors, keyed by the line label the service returns. */
  colors: Record<string, string>;
  /** lines to render dashed (e.g. bollinger bands). */
  dashed?: string[];
  /** horizontal reference lines for pane indicators (e.g. RSI 30/70). */
  levels?: { price: number; color: string; title: string }[];
};

export const INDICATOR_PRESETS: IndicatorPreset[] = [
  {
    key: "sma20",
    label: "SMA 20",
    kind: "overlay",
    spec: { type: "sma", params: { period: 20 } },
    colors: { sma: "#F7931A" },
  },
  {
    key: "ema20",
    label: "EMA 20",
    kind: "overlay",
    spec: { type: "ema", params: { period: 20 } },
    colors: { ema: "#4C8DF6" },
  },
  {
    key: "ema50",
    label: "EMA 50",
    kind: "overlay",
    spec: { type: "ema", params: { period: 50 } },
    colors: { ema: "#B18CFF" },
  },
  {
    key: "bb20",
    label: "Bollinger Bands (20, 2)",
    kind: "overlay",
    spec: { type: "bollinger", params: { period: 20, stdDev: 2 } },
    colors: { upper: "#9AA1AA", middle: "#9AA1AA", lower: "#9AA1AA" },
    dashed: ["upper", "lower"],
  },
  {
    key: "rsi14",
    label: "RSI 14",
    kind: "pane",
    paneId: "rsi",
    spec: { type: "rsi", params: { period: 14 } },
    colors: { rsi: "#B18CFF" },
    levels: [
      { price: 70, color: "rgba(240,97,109,0.4)", title: "70" },
      { price: 30, color: "rgba(46,211,160,0.4)", title: "30" },
    ],
  },
  {
    key: "macd",
    label: "MACD 12/26/9",
    kind: "pane",
    paneId: "macd",
    spec: { type: "macd", params: { fast: 12, slow: 26, signal: 9 } },
    colors: { macd: "#4C8DF6", signal: "#F7931A", histogram: "" },
  },
];

export function presetByKey(key: string): IndicatorPreset | undefined {
  return INDICATOR_PRESETS.find((p) => p.key === key);
}

export function resolvePresets(keys: string[]): IndicatorPreset[] {
  return keys.map(presetByKey).filter((p): p is IndicatorPreset => Boolean(p));
}

/** Build the payload the Go gateway forwards verbatim to the Python service. */
export function buildIndicatorPayload(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  presets: IndicatorPreset[],
) {
  return {
    symbol,
    timeframe,
    candles: candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    })),
    indicators: presets.map((p) => p.spec),
  };
}

/**
 * Fetch indicator series through the Go gateway.
 *
 * Keyed on the *candle window* (length + last bar time), so live in-place
 * candle updates never spam the API — the query re-fires only when a fresh
 * kline window arrives (symbol/timeframe change) or a new bar closes. The
 * payload is built from the latest candle rows at fetch time.
 */
export function useIndicatorSeries(opts: {
  symbol: string;
  /** backend canonical label, e.g. "4h". */
  timeframe: string;
  candles: Candle[];
  /** `${rows.length}:${lastBarTime}` — changes only on fresh fetches / new bars. */
  candleWindow: string;
  activeKeys: string[];
}): { response: IndicatorResponse | null; loading: boolean; error: boolean } {
  const { symbol, timeframe, candles, candleWindow, activeKeys } = opts;
  const presets = resolvePresets(activeKeys);

  const query = useQuery({
    queryKey: ["indicators", symbol, timeframe, candleWindow, activeKeys.join("+")],
    queryFn: async () => {
      const res = await api.post<IndicatorResponse>(
        "/indicators/calculate",
        buildIndicatorPayload(symbol, timeframe, candles, presets),
      );
      return res;
    },
    enabled: presets.length > 0 && candles.length > 0,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    response: query.data ?? null,
    // isFetching (not isPending) so the badge also shows during new-bar refetches.
    loading: query.isFetching && presets.length > 0,
    error: query.isError,
  };
}
