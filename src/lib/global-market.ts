import { useEffect, useState } from "react";

/**
 * Global markets (stocks & forex).
 *
 * Crypto already streams real prices over Binance; stocks and forex have no
 * bundled live feed, so they run on a lightweight simulated ticker that jitters
 * prices every 2 seconds (a random walk around the previous close) — matching
 * the app's mock-first data philosophy. Swap in a real market-data API later by
 * replacing the interval with a WebSocket or polling feed.
 */

export type TickerKind = "stocks" | "forex";

export type GlobalTicker = {
  id: string;
  symbol: string;
  name: string;
  kind: TickerKind;
  price: number;
  prevClose: number;
  change: number; // % vs prev close
  volume: number; // 24h volume in USD
  marketCap?: number;
  spark: number[];
};

/** Deterministic little sparkline so SSR and first paint are stable. */
function sparkFrom(seed: number, price: number, len = 28): number[] {
  let x = seed;
  const rand = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  const out: number[] = [];
  let v = price * (0.985 + rand() * 0.02);
  for (let i = 0; i < len; i++) {
    out.push(v);
    v *= 1 + (rand() - 0.48) * 0.006;
  }
  return out;
}

export const stockTickers: GlobalTicker[] = [
  {
    id: "aapl",
    symbol: "AAPL",
    name: "Apple",
    kind: "stocks",
    price: 212.4,
    prevClose: 210.64,
    change: 0.84,
    volume: 52_400_000_000,
    marketCap: 3_240_000_000_000,
    spark: sparkFrom(11, 212.4),
  },
  {
    id: "nvda",
    symbol: "NVDA",
    name: "NVIDIA",
    kind: "stocks",
    price: 173.2,
    prevClose: 170.44,
    change: 1.62,
    volume: 38_900_000_000,
    marketCap: 4_270_000_000_000,
    spark: sparkFrom(23, 173.2),
  },
  {
    id: "msft",
    symbol: "MSFT",
    name: "Microsoft",
    kind: "stocks",
    price: 468.1,
    prevClose: 469.55,
    change: -0.31,
    volume: 21_300_000_000,
    marketCap: 3_480_000_000_000,
    spark: sparkFrom(31, 468.1),
  },
  {
    id: "tsla",
    symbol: "TSLA",
    name: "Tesla",
    kind: "stocks",
    price: 296.55,
    prevClose: 290.34,
    change: 2.14,
    volume: 33_700_000_000,
    marketCap: 946_000_000_000,
    spark: sparkFrom(43, 296.55),
  },
  {
    id: "amzn",
    symbol: "AMZN",
    name: "Amazon",
    kind: "stocks",
    price: 221.3,
    prevClose: 219.72,
    change: 0.72,
    volume: 15_600_000_000,
    marketCap: 2_320_000_000_000,
    spark: sparkFrom(53, 221.3),
  },
  {
    id: "googl",
    symbol: "GOOGL",
    name: "Alphabet",
    kind: "stocks",
    price: 182.75,
    prevClose: 180.85,
    change: 1.05,
    volume: 19_800_000_000,
    marketCap: 2_250_000_000_000,
    spark: sparkFrom(61, 182.75),
  },
  {
    id: "meta",
    symbol: "META",
    name: "Meta Platforms",
    kind: "stocks",
    price: 612.8,
    prevClose: 615.75,
    change: -0.48,
    volume: 14_200_000_000,
    marketCap: 1_550_000_000_000,
    spark: sparkFrom(71, 612.8),
  },
  {
    id: "amd",
    symbol: "AMD",
    name: "Advanced Micro Devices",
    kind: "stocks",
    price: 168.4,
    prevClose: 165.21,
    change: 1.93,
    volume: 27_500_000_000,
    marketCap: 273_000_000_000,
    spark: sparkFrom(83, 168.4),
  },
  {
    id: "nflx",
    symbol: "NFLX",
    name: "Netflix",
    kind: "stocks",
    price: 1012.3,
    prevClose: 1006.56,
    change: 0.57,
    volume: 9_100_000_000,
    marketCap: 432_000_000_000,
    spark: sparkFrom(97, 1012.3),
  },
  {
    id: "jpm",
    symbol: "JPM",
    name: "JPMorgan Chase",
    kind: "stocks",
    price: 268.1,
    prevClose: 267.48,
    change: 0.23,
    volume: 7_800_000_000,
    marketCap: 755_000_000_000,
    spark: sparkFrom(101, 268.1),
  },
];

export const forexTickers: GlobalTicker[] = [
  {
    id: "eurusd",
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    kind: "forex",
    price: 1.0842,
    prevClose: 1.0829,
    change: 0.12,
    volume: 128_000_000_000,
    spark: sparkFrom(13, 1.0842),
  },
  {
    id: "gbpusd",
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    kind: "forex",
    price: 1.2735,
    prevClose: 1.2761,
    change: -0.2,
    volume: 86_000_000_000,
    spark: sparkFrom(17, 1.2735),
  },
  {
    id: "usdjpy",
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    kind: "forex",
    price: 155.28,
    prevClose: 154.72,
    change: 0.36,
    volume: 112_000_000_000,
    spark: sparkFrom(19, 155.28),
  },
  {
    id: "usdchf",
    symbol: "USD/CHF",
    name: "US Dollar / Swiss Franc",
    kind: "forex",
    price: 0.9024,
    prevClose: 0.9008,
    change: 0.18,
    volume: 41_000_000_000,
    spark: sparkFrom(23, 0.9024),
  },
  {
    id: "audusd",
    symbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    kind: "forex",
    price: 0.6582,
    prevClose: 0.6597,
    change: -0.23,
    volume: 54_000_000_000,
    spark: sparkFrom(29, 0.6582),
  },
  {
    id: "usdcad",
    symbol: "USD/CAD",
    name: "US Dollar / Canadian Dollar",
    kind: "forex",
    price: 1.372,
    prevClose: 1.3701,
    change: 0.14,
    volume: 47_000_000_000,
    spark: sparkFrom(31, 1.372),
  },
  {
    id: "nzdusd",
    symbol: "NZD/USD",
    name: "New Zealand Dollar / US Dollar",
    kind: "forex",
    price: 0.6114,
    prevClose: 0.613,
    change: -0.26,
    volume: 18_000_000_000,
    spark: sparkFrom(37, 0.6114),
  },
  {
    id: "eurgbp",
    symbol: "EUR/GBP",
    name: "Euro / British Pound",
    kind: "forex",
    price: 0.8512,
    prevClose: 0.8486,
    change: 0.31,
    volume: 26_000_000_000,
    spark: sparkFrom(41, 0.8512),
  },
  {
    id: "usdsgd",
    symbol: "USD/SGD",
    name: "US Dollar / Singapore Dollar",
    kind: "forex",
    price: 1.3412,
    prevClose: 1.3402,
    change: 0.07,
    volume: 22_000_000_000,
    spark: sparkFrom(43, 1.3412),
  },
  {
    id: "xauusd",
    symbol: "XAU/USD",
    name: "Gold (Spot)",
    kind: "forex",
    price: 2420.1,
    prevClose: 2411.3,
    change: 0.36,
    volume: 65_000_000_000,
    spark: sparkFrom(47, 2420.1),
  },
];

/**
 * Simulated realtime tickers — prices jitter every 2s around the prev close.
 * Pass `enabled = false` to freeze updates (e.g. when the tab is hidden).
 */
export function useSimulatedTickers(kind: TickerKind, enabled = true): GlobalTicker[] {
  const seed = kind === "stocks" ? stockTickers : forexTickers;
  const [rows, setRows] = useState<GlobalTicker[]>(seed);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setRows((prev) =>
        prev.map((t) => {
          const drift = (Math.random() - 0.5) * 0.0022;
          const price = Math.max(t.price * (1 + drift), 0.0001);
          const change = ((price - t.prevClose) / t.prevClose) * 100;
          return {
            ...t,
            price,
            change,
            spark: t.spark.length > 0 ? [...t.spark.slice(1), price] : t.spark,
          };
        }),
      );
    }, 2000);
    return () => clearInterval(id);
  }, [kind, enabled]);

  return rows;
}
