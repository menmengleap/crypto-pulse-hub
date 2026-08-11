/**
 * Mock market data for the Market Summary dashboard.
 *
 * Everything is generated from a seeded PRNG so server-rendered markup and
 * client hydration produce identical charts. Swap these values for a real
 * market-data API later without touching the components.
 */

export interface SeriesPoint {
  /** Time / axis label, e.g. "10:05" or "Jun". */
  label: string;
  value: number;
}

export interface MarketInstrument {
  symbol: string;
  name: string;
  /** Exchange / venue text shown under the name. */
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  /** Brand color for the circular icon badge. */
  color: string;
  /** Short label rendered inside the circular icon. */
  badge: string;
}

export interface SeriesInstrument {
  symbol: string;
  name: string;
  ticker: string;
  value: number;
  change: number;
  changePercent: number;
  series: SeriesPoint[];
}

export interface MarketSummaryData {
  sp500: SeriesInstrument;
  indices: MarketInstrument[];
  dollarIndex: SeriesInstrument;
  futures: MarketInstrument[];
  treasury10y: SeriesInstrument;
  inflation: {
    series: SeriesPoint[];
    avg: string;
    forecast: string;
    nextRelease: string;
  };
}

/* ------------------------------------------------------------------------- */
/* Deterministic series helpers                                              */
/* ------------------------------------------------------------------------- */

/** mulberry32 — small, fast, seeded PRNG so charts are stable across SSR. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly spaced trading-session labels, 09:30 → 16:00. */
function tradingLabels(n: number): string[] {
  const out: string[] = [];
  const startMin = 9 * 60 + 30;
  const endMin = 16 * 60;
  const step = (endMin - startMin) / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) {
    const m = Math.round(startMin + i * step);
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

/**
 * Random-walk intraday series that drifts from `start` toward `start*(1+driftPct)`.
 * Volatility is scaled to the price so every chart moves at a similar pace.
 */
function intradaySeries(seed: number, start: number, driftPct: number, points = 48): SeriesPoint[] {
  const rand = mulberry32(seed);
  const labels = tradingLabels(points);
  const stepDrift = driftPct / (points - 1);
  let v = start;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points; i++) {
    if (i > 0) {
      const noise = (rand() - 0.5) * 0.006; // ±0.3% per step
      v *= 1 + stepDrift + noise;
    }
    out.push({ label: labels[i]!, value: round(v) });
  }
  return out;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Build a deterministic intraday series anchored to a live value: it starts at
 * yesterday's implied close (derived from `current` and `changePct`) and drifts
 * to exactly `current`, so the chart's endpoint and daily change are real while
 * the intraday noise stays SSR-stable.
 */
export function liveAnchoredSeries(
  seed: number,
  current: number,
  changePct: number,
  points = 44,
): SeriesPoint[] {
  const divisor = 1 + changePct / 100;
  // Defensive: an extreme (or non-finite) change would divide by zero — fall
  // back to a flat series anchored at the live value instead of NaN.
  if (!Number.isFinite(divisor) || divisor <= 0) {
    return intradaySeries(seed, current, 0, points);
  }
  const start = current / divisor;
  return intradaySeries(seed, start, changePct / 100, points);
}

/* ------------------------------------------------------------------------- */
/* Data                                                                      */
/* ------------------------------------------------------------------------- */

export const marketSummaryData: MarketSummaryData = {
  sp500: {
    symbol: "SPX",
    name: "S&P 500",
    ticker: "SPX · NYSE",
    value: 5438.66,
    change: -34.28,
    changePercent: -0.63,
    series: intradaySeries(11, 5472.94, -0.0063, 60),
  },

  indices: [
    {
      symbol: "NDX",
      name: "Nasdaq 100",
      ticker: "NDX · NASDAQ",
      price: 18924.52,
      change: 79.12,
      changePercent: 0.42,
      color: "#3B82F6",
      badge: "ND",
    },
    {
      symbol: "SPX",
      name: "S&P 500",
      ticker: "SPX · NYSE",
      price: 5438.66,
      change: -34.28,
      changePercent: -0.63,
      color: "#F97316",
      badge: "SP",
    },
    {
      symbol: "000001",
      name: "SSE Composite",
      ticker: "000001.SS · SHH",
      price: 3051.71,
      change: 5.42,
      changePercent: 0.18,
      color: "#EF4444",
      badge: "SS",
    },
    {
      symbol: "UKX",
      name: "FTSE 100",
      ticker: "UKX · LSE",
      price: 8204.36,
      change: -17.29,
      changePercent: -0.21,
      color: "#8B5CF6",
      badge: "FT",
    },
    {
      symbol: "DAX",
      name: "DAX",
      ticker: "DAX · XETRA",
      price: 18148.2,
      change: 16.34,
      changePercent: 0.09,
      color: "#14B8A6",
      badge: "DX",
    },
    {
      symbol: "N225",
      name: "Nikkei 225",
      ticker: "N225 · TSE",
      price: 38729.4,
      change: 503.48,
      changePercent: 1.32,
      color: "#EC4899",
      badge: "NK",
    },
  ],

  dollarIndex: {
    symbol: "DXY",
    name: "US Dollar Index",
    ticker: "DXY · ICE",
    value: 103.42,
    change: -0.19,
    changePercent: -0.18,
    series: intradaySeries(37, 103.61, -0.0018, 40),
  },

  futures: [
    {
      symbol: "CL",
      name: "Light crude oil",
      ticker: "CL · NYMEX",
      price: 78.43,
      change: -0.57,
      changePercent: -0.72,
      color: "#94A3B8",
      badge: "CR",
    },
    {
      symbol: "NG",
      name: "Natural gas",
      ticker: "NG · NYMEX",
      price: 2.612,
      change: 0.03,
      changePercent: 1.15,
      color: "#38BDF8",
      badge: "NG",
    },
    {
      symbol: "GC",
      name: "Gold",
      ticker: "GC · COMEX",
      price: 2414.8,
      change: 8.45,
      changePercent: 0.35,
      color: "#EAB308",
      badge: "AU",
    },
    {
      symbol: "HG",
      name: "Copper",
      ticker: "HG · COMEX",
      price: 4.512,
      change: -0.02,
      changePercent: -0.44,
      color: "#B45309",
      badge: "CU",
    },
  ],

  treasury10y: {
    symbol: "US10Y",
    name: "US 10Y yield",
    ticker: "US10Y · Treasury",
    value: 4.31,
    change: 0.02,
    changePercent: 0.47,
    series: intradaySeries(47, 4.29, 0.0047, 40),
  },

  inflation: {
    series: [
      { label: "Jan", value: 3.1 },
      { label: "Feb", value: 3.2 },
      { label: "Mar", value: 3.5 },
      { label: "Apr", value: 3.4 },
      { label: "May", value: 3.3 },
      { label: "Jun", value: 3.0 },
      { label: "Jul", value: 2.9 },
    ],
    avg: "3.0%",
    forecast: "2.7%",
    nextRelease: "Aug 13, 2026",
  },
};
