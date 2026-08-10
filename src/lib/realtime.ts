import { create } from "zustand";
import {
  assets as staticAssets,
  globalStats as staticGlobal,
  type Asset,
  type GlobalStats,
} from "./market-data";
import { api } from "./api";

/**
 * Realtime market data layer.
 *
 * All live data flows through the backend: User → Frontend → Backend → provider.
 * The browser never calls Binance, CoinGecko or any other provider directly.
 * The backend fetches from Binance (crypto), exchangerate-api/Frankfurter
 * (forex) and Yahoo/Finnhub (stocks), caches the results and serves them over
 * /api/live/*. The frontend polls those endpoints on matching cadences —
 * crypto every 8s (5–10s), global stats every 15s, chart candles every 6s.
 */

/** Polling cadences (crypto 5–10s, global 15s, chart candles ~6s). */
const CRYPTO_POLL_MS = 8000;
const GLOBAL_POLL_MS = 15000;
const KLINE_POLL_MS = 6000;

export type MarketStatus = "static" | "live" | "offline";

/** Backend market snapshot (mirrors marketdata.Snapshot). */
type BackendSnapshot = {
  symbol: string;
  price: number;
  change24h: number;
  change7d: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  rsi: number;
};

/** Backend OHLCV candle (mirrors marketdata.Candle). */
type BackendCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Normalize a frontend timeframe label to the backend's canonical label. */
function normalizeInterval(tf: string): string {
  const map: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1H": "1h",
    "4H": "4h",
    "1D": "1d",
    "1W": "1w",
  };
  return map[tf] ?? "4h";
}

const toCandle = (c: BackendCandle): Candle => ({
  time: c.timestamp,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
  volume: c.volume,
});

/** Fetch historical candles for a symbol via the backend (/api/live/klines). */
export async function fetchKlines(symbol: string, tf: string, limit = 320): Promise<Candle[]> {
  const interval = normalizeInterval(tf);
  const rows = await api.get<BackendCandle[]>(
    `/live/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${interval}&limit=${limit}`,
  );
  return rows.map(toCandle);
}

/**
 * Subscribe to realtime candle updates for a symbol by polling the backend for
 * the latest candle. Returns an unsubscribe function.
 */
export function subscribeKline(
  symbol: string,
  tf: string,
  onUpdate: (c: Candle) => void,
): () => void {
  let last: Candle | null = null;
  let disposed = false;

  const tick = async () => {
    if (disposed) return;
    try {
      const rows = await fetchKlines(symbol, tf, 2);
      const c = rows[rows.length - 1];
      if (c && (!last || last.time !== c.time || last.close !== c.close)) {
        last = c;
        onUpdate(c);
      }
    } catch {
      /* keep last known candle */
    }
  };

  void tick();
  const id = window.setInterval(() => void tick(), KLINE_POLL_MS);
  return () => {
    disposed = true;
    window.clearInterval(id);
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type MarketState = {
  assets: Asset[];
  global: GlobalStats;
  status: MarketStatus;
  _merge: (updater: (assets: Asset[]) => Asset[]) => void;
  _setGlobal: (patch: Partial<GlobalStats>) => void;
  _setStatus: (status: MarketStatus) => void;
};

export const useMarketStore = create<MarketState>((set) => ({
  assets: staticAssets,
  global: staticGlobal,
  status: "static",
  _merge: (updater) => set((s) => ({ assets: updater(s.assets) })),
  _setGlobal: (patch) => set((s) => ({ global: { ...s.global, ...patch } })),
  _setStatus: (status) => set({ status }),
}));

export function useLiveAssets(): Asset[] {
  return useMarketStore((s) => s.assets);
}

export function useLiveGlobal(): GlobalStats {
  return useMarketStore((s) => s.global);
}

export function useMarketStatus(): MarketStatus {
  return useMarketStore((s) => s.status);
}

// ---------------------------------------------------------------------------
// Backend polling
// ---------------------------------------------------------------------------

let started = false;
let cryptoTimer: number | null = null;
let globalTimer: number | null = null;

function pushSpark(spark: number[], price: number): number[] {
  const next = [...spark, price];
  return next.length > 32 ? next.slice(next.length - 32) : next;
}

/** Poll live crypto snapshots from the backend (cached Binance data). */
async function pollMarkets() {
  let snaps: BackendSnapshot[];
  try {
    snaps = await api.get<BackendSnapshot[]>("/live/markets");
  } catch {
    useMarketStore.getState()._setStatus("offline");
    return;
  }
  const bySymbol = new Map(snaps.map((s) => [s.symbol, s]));
  useMarketStore.getState()._merge((assets) =>
    assets.map((a) => {
      const s = bySymbol.get(a.symbol);
      if (!s || !Number.isFinite(s.price) || s.price <= 0) return a;
      return {
        ...a,
        price: s.price,
        change24h: Number.isFinite(s.change24h) ? s.change24h : a.change24h,
        change7d: Number.isFinite(s.change7d) ? s.change7d : a.change7d,
        marketCap: s.marketCap > 0 ? s.marketCap : a.marketCap,
        volume24h: s.volume24h > 0 ? s.volume24h : a.volume24h,
        rsi: Number.isFinite(s.rsi) && s.rsi > 0 ? s.rsi : a.rsi,
        spark: pushSpark(a.spark, s.price),
      };
    }),
  );
  useMarketStore.getState()._setStatus("live");
}

type BackendGlobal = {
  metrics: {
    totalMarketCap: number;
    marketCapChange: number;
    totalVolume: number;
    volumeChange: number;
    btcDominance: number;
    ethDominance: number;
    otherDominance: number;
  };
  fearGreed: { value: number; label: string };
};

/** Poll global metrics + fear & greed from the backend (/api/live/global). */
async function pollGlobal() {
  try {
    const g = await api.get<BackendGlobal>("/live/global");
    const m = g.metrics;
    const fg = g.fearGreed;
    const patch: Partial<GlobalStats> = {};
    if (m.totalMarketCap > 0) patch.marketCap = m.totalMarketCap;
    if (m.totalVolume > 0) patch.volume24h = m.totalVolume;
    if (Number.isFinite(m.marketCapChange)) patch.marketCapChange = m.marketCapChange;
    if (Number.isFinite(m.volumeChange)) patch.volumeChange = m.volumeChange;
    if (Number.isFinite(m.btcDominance)) patch.btcDominance = m.btcDominance;
    if (Number.isFinite(m.ethDominance)) patch.ethDominance = m.ethDominance;
    if (Number.isFinite(m.otherDominance)) patch.otherDominance = m.otherDominance;
    if (fg && Number.isInteger(fg.value) && fg.value > 0) {
      patch.fearGreed = fg.value;
      if (fg.label) patch.fearGreedLabel = fg.label;
    }
    useMarketStore.getState()._setGlobal(patch);
    if (useMarketStore.getState().status === "static") {
      useMarketStore.getState()._setStatus("live");
    }
  } catch {
    /* keep static data */
  }
}

/** Seed each asset's sparkline with real 15m closes (once, on start). */
async function loadSparks() {
  const entries = await Promise.all(
    staticAssets.map(async (a) => {
      try {
        const rows = await fetchKlines(a.symbol, "15m", 32);
        return [a.id, rows.map((r) => r.close)] as const;
      } catch {
        return [a.id, null] as const;
      }
    }),
  );
  const sparkById = new Map(entries);
  useMarketStore.getState()._merge((assets) =>
    assets.map((a) => {
      const spark = sparkById.get(a.id);
      return spark && spark.length >= 2 ? { ...a, spark } : a;
    }),
  );
}

/**
 * Kick off realtime market data. Safe to call multiple times; only the first
 * call starts the pollers. Must run on the client only (SSR keeps static data).
 */
export function initRealtime() {
  if (started || typeof window === "undefined") return;
  started = true;
  void loadSparks();
  void pollMarkets();
  void pollGlobal();
  cryptoTimer = window.setInterval(() => void pollMarkets(), CRYPTO_POLL_MS);
  globalTimer = window.setInterval(() => void pollGlobal(), GLOBAL_POLL_MS);
}
