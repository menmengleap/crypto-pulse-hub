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
  /** Commodities shown inside the US Dollar Index card. */
  commodities: MarketInstrument[];
  forex: MarketInstrument[];
  futures: MarketInstrument[];
  bonds: MarketInstrument[];
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
      ticker: "SPX · S&P",
      price: 5438.66,
      change: -34.28,
      changePercent: -0.63,
      color: "#F97316",
      badge: "SP",
    },
    {
      symbol: "DJI",
      name: "Dow Jones",
      ticker: "DJI · DJIA",
      price: 38912.3,
      change: 156.2,
      changePercent: 0.4,
      color: "#14B8A6",
      badge: "DJ",
    },
    {
      symbol: "RUT",
      name: "Russell 2000",
      ticker: "RUT · RUSSELL",
      price: 2085.4,
      change: -8.6,
      changePercent: -0.41,
      color: "#8B5CF6",
      badge: "RT",
    },
    {
      symbol: "VIX",
      name: "CBOE Volatility",
      ticker: "VIX · CBOE",
      price: 17.42,
      change: -0.64,
      changePercent: -3.54,
      color: "#EF4444",
      badge: "VX",
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

  commodities: [
    {
      symbol: "XAU/USD",
      name: "Gold (Spot)",
      ticker: "XAU/USD · SPOT",
      price: 4372.23,
      change: -17.76,
      changePercent: -0.4,
      color: "#EAB308",
      badge: "AU",
    },
    {
      symbol: "XAG/USD",
      name: "Silver (Spot)",
      ticker: "XAG/USD · SPOT",
      price: 31.42,
      change: 0.18,
      changePercent: 0.58,
      color: "#94A3B8",
      badge: "AG",
    },
    {
      symbol: "WTI",
      name: "Crude Oil WTI",
      ticker: "WTI · NYMEX",
      price: 78.43,
      change: -0.57,
      changePercent: -0.72,
      color: "#F97316",
      badge: "WT",
    },
    {
      symbol: "BRENT",
      name: "Brent Crude",
      ticker: "BRENT · ICE",
      price: 82.15,
      change: -0.42,
      changePercent: -0.51,
      color: "#B45309",
      badge: "BR",
    },
    {
      symbol: "NATURAL GAS",
      name: "Natural Gas",
      ticker: "NG · NYMEX",
      price: 2.612,
      change: 0.03,
      changePercent: 1.15,
      color: "#38BDF8",
      badge: "NG",
    },
  ],

  forex: [
    {
      symbol: "EUR/USD",
      name: "Euro / US Dollar",
      ticker: "EUR/USD · FX",
      price: 1.15347,
      change: -0.0007,
      changePercent: -0.06,
      color: "#3B82F6",
      badge: "EU",
    },
    {
      symbol: "GBP/USD",
      name: "British Pound / US Dollar",
      ticker: "GBP/USD · FX",
      price: 1.2735,
      change: 0.0011,
      changePercent: 0.09,
      color: "#8B5CF6",
      badge: "GB",
    },
    {
      symbol: "USD/JPY",
      name: "US Dollar / Japanese Yen",
      ticker: "USD/JPY · FX",
      price: 155.28,
      change: 0.42,
      changePercent: 0.27,
      color: "#EF4444",
      badge: "JP",
    },
    {
      symbol: "USD/CHF",
      name: "US Dollar / Swiss Franc",
      ticker: "USD/CHF · FX",
      price: 0.9024,
      change: -0.0006,
      changePercent: -0.07,
      color: "#14B8A6",
      badge: "CH",
    },
    {
      symbol: "AUD/USD",
      name: "Australian Dollar / US Dollar",
      ticker: "AUD/USD · FX",
      price: 0.6582,
      change: 0.0004,
      changePercent: 0.06,
      color: "#F59E0B",
      badge: "AU",
    },
    {
      symbol: "USD/CAD",
      name: "US Dollar / Canadian Dollar",
      ticker: "USD/CAD · FX",
      price: 1.372,
      change: -0.0009,
      changePercent: -0.07,
      color: "#EC4899",
      badge: "CA",
    },
    {
      symbol: "NZD/USD",
      name: "New Zealand Dollar / US Dollar",
      ticker: "NZD/USD · FX",
      price: 0.6114,
      change: 0.0003,
      changePercent: 0.05,
      color: "#10B981",
      badge: "NZ",
    },
    {
      symbol: "EUR/GBP",
      name: "Euro / British Pound",
      ticker: "EUR/GBP · FX",
      price: 0.8512,
      change: -0.0008,
      changePercent: -0.09,
      color: "#6366F1",
      badge: "EG",
    },
    {
      symbol: "EUR/JPY",
      name: "Euro / Japanese Yen",
      ticker: "EUR/JPY · FX",
      price: 163.42,
      change: 0.31,
      changePercent: 0.19,
      color: "#0EA5E9",
      badge: "EJ",
    },
    {
      symbol: "GBP/JPY",
      name: "British Pound / Japanese Yen",
      ticker: "GBP/JPY · FX",
      price: 193.51,
      change: 0.68,
      changePercent: 0.35,
      color: "#F43F5E",
      badge: "GJ",
    },
  ],

  futures: [
    {
      symbol: "ES",
      name: "S&P 500 E-mini",
      ticker: "ES · CME",
      price: 5436.75,
      change: -32.5,
      changePercent: -0.59,
      color: "#F97316",
      badge: "ES",
    },
    {
      symbol: "NQ",
      name: "Nasdaq 100 E-mini",
      ticker: "NQ · CME",
      price: 18940.0,
      change: 76.1,
      changePercent: 0.4,
      color: "#3B82F6",
      badge: "NQ",
    },
    {
      symbol: "YM",
      name: "Dow E-mini",
      ticker: "YM · CME",
      price: 38900.0,
      change: 141.0,
      changePercent: 0.36,
      color: "#14B8A6",
      badge: "YM",
    },
    {
      symbol: "RTY",
      name: "Russell 2000 E-mini",
      ticker: "RTY · CME",
      price: 2088.0,
      change: -9.1,
      changePercent: -0.43,
      color: "#8B5CF6",
      badge: "RT",
    },
    {
      symbol: "GC",
      name: "Gold Futures",
      ticker: "GC · COMEX",
      price: 4390.2,
      change: -18.4,
      changePercent: -0.42,
      color: "#EAB308",
      badge: "GC",
    },
    {
      symbol: "SI",
      name: "Silver Futures",
      ticker: "SI · COMEX",
      price: 31.5,
      change: 0.19,
      changePercent: 0.61,
      color: "#94A3B8",
      badge: "SI",
    },
    {
      symbol: "CL",
      name: "Crude Oil Futures",
      ticker: "CL · NYMEX",
      price: 78.4,
      change: -0.57,
      changePercent: -0.72,
      color: "#B45309",
      badge: "CL",
    },
    {
      symbol: "NG",
      name: "Natural Gas Futures",
      ticker: "NG · NYMEX",
      price: 2.61,
      change: 0.03,
      changePercent: 1.15,
      color: "#38BDF8",
      badge: "NG",
    },
  ],

  bonds: [
    {
      symbol: "US02Y",
      name: "US 2Y Treasury",
      ticker: "US02Y · TRSY",
      price: 4.14,
      change: 0.01,
      changePercent: 0.24,
      color: "#38BDF8",
      badge: "2Y",
    },
    {
      symbol: "US30Y",
      name: "US 30Y Treasury",
      ticker: "US30Y · TRSY",
      price: 4.68,
      change: -0.01,
      changePercent: -0.21,
      color: "#A78BFA",
      badge: "30Y",
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
