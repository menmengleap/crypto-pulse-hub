import { create } from "zustand";
import {
  assets as staticAssets,
  globalStats as staticGlobal,
  type Asset,
  type GlobalStats,
} from "./market-data";

/**
 * Realtime market data layer.
 *
 * Prices are streamed over Binance's public market-data WebSocket (no API key
 * required) and snapshotted from CoinGecko for market caps, 7d change and real
 * asset logos. The chart uses TradingView's Lightweight Charts fed with real
 * Binance klines. If the WebSocket can't connect, we fall back to polling
 * Binance's public REST endpoint so prices stay live.
 */

const WS_BASE = "wss://data-stream.binance.vision/stream";
const REST_BASE = "https://data-api.binance.vision";
const CG_BASE = "https://api.coingecko.com/api/v3";
const FNG_URL = "https://api.alternative.me/fng/?limit=30";

/** CoinGecko ids keyed by the app's asset id. */
const COINGECKO_IDS: Record<string, string> = {
  bitcoin: "bitcoin",
  ethereum: "ethereum",
  tether: "tether",
  solana: "solana",
  xrp: "ripple",
  bnb: "binancecoin",
  cardano: "cardano",
  dogecoin: "dogecoin",
  avalanche: "avalanche-2",
  arbitrum: "arbitrum",
  optimism: "optimism",
  uniswap: "uniswap",
  aave: "aave",
  render: "render-token",
  fetch: "fetch-ai",
  immutable: "immutable-x",
  sandbox: "the-sandbox",
  pepe: "pepe",
};

export type MarketStatus = "static" | "live" | "offline";

type Ticker = {
  s: string;
  c: string; // last price
  P: string; // 24h change percent
  q: string; // 24h quote volume
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/** Binance symbol for an asset, or null when it has no USDT pair (stablecoins). */
export function binanceSymbol(asset: Asset): string | null {
  if (asset.pair === "USDT/USD") return null;
  return asset.pair.replace("/", "");
}

/** Binance symbol for the chart page (symbol + USDT). */
export function chartSymbol(symbol: string): string {
  if (symbol === "USDT") return "USDCUSDT";
  return `${symbol}USDT`;
}

export function binanceInterval(tf: string): string {
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

/** Fetch historical candles for a symbol from Binance's public REST API. */
export async function fetchKlines(symbol: string, tf: string, limit = 320): Promise<Candle[]> {
  const interval = binanceInterval(tf);
  const res = await fetch(
    `${REST_BASE}/api/v3/klines?symbol=${chartSymbol(symbol)}&interval=${interval}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`klines for ${symbol} failed`);
  const rows = (await res.json()) as number[][];
  return rows.map((k) => ({
    time: Math.floor((k[0] ?? 0) / 1000),
    open: parseFloat(String(k[1] ?? 0)),
    high: parseFloat(String(k[2] ?? 0)),
    low: parseFloat(String(k[3] ?? 0)),
    close: parseFloat(String(k[4] ?? 0)),
    volume: parseFloat(String(k[5] ?? 0)),
  }));
}

/** Subscribe to realtime candle updates for a symbol. Returns an unsubscribe fn. */
export function subscribeKline(
  symbol: string,
  tf: string,
  onUpdate: (c: Candle) => void,
): () => void {
  const interval = binanceInterval(tf);
  const s = chartSymbol(symbol).toLowerCase();
  const ws = new WebSocket(`${WS_BASE}?streams=${s}@kline_${interval}`);
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      const k = msg?.data?.k;
      if (!k) return;
      onUpdate({
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      });
    } catch {
      /* ignore malformed frames */
    }
  };
  return () => {
    try {
      ws.close();
    } catch {
      /* noop */
    }
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
// Connection management
// ---------------------------------------------------------------------------

let started = false;
let ws: WebSocket | null = null;
let retry = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const tickerBuffer = new Map<string, Ticker>();

function binanceStreams(): string[] {
  return staticAssets.flatMap((a) => {
    const s = binanceSymbol(a);
    return s ? [`${s.toLowerCase()}@ticker`] : [];
  });
}

/** Apply buffered ticker updates to the store (throttled to every 2s). */
function flushTickers() {
  if (tickerBuffer.size === 0) return;
  const buffer = new Map(tickerBuffer);
  tickerBuffer.clear();
  useMarketStore.getState()._merge((assets) =>
    assets.map((a) => {
      const s = binanceSymbol(a);
      const t = s ? buffer.get(s) : undefined;
      if (!t) return a;
      const price = parseFloat(t.c);
      if (!Number.isFinite(price)) return a;
      const change24h = parseFloat(t.P);
      const volume24h = parseFloat(t.q);
      return {
        ...a,
        price,
        change24h: Number.isFinite(change24h) ? change24h : a.change24h,
        volume24h: Number.isFinite(volume24h) ? volume24h : a.volume24h,
        spark: a.spark.length > 0 ? [...a.spark.slice(1), price] : a.spark,
      };
    }),
  );
  useMarketStore.getState()._setStatus("live");
}

function connect() {
  const streams = binanceStreams();
  if (streams.length === 0 || typeof WebSocket === "undefined") return;
  try {
    ws = new WebSocket(`${WS_BASE}?streams=${streams.join("/")}`);
  } catch {
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    retry = 0;
    stopPolling();
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = setInterval(flushTickers, 2000);
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data));
      if (msg?.stream?.endsWith("@ticker") && msg.data?.s) tickerBuffer.set(msg.data.s, msg.data);
    } catch {
      /* ignore */
    }
  };
  ws.onclose = () => {
    stopFlush();
    useMarketStore.getState()._setStatus("offline");
    scheduleReconnect();
  };
  ws.onerror = () => {
    try {
      ws?.close();
    } catch {
      /* noop */
    }
  };
}

function stopFlush() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(retry, 5));
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    retry += 1;
    if (retry >= 3) startPolling(); // WebSocket unreachable: fall back to REST polling
    connect();
  }, delay);
}

/** Fallback: poll the 24h ticker endpoint when the WebSocket is unavailable. */
async function pollBinance() {
  const symbols = staticAssets.flatMap((a) => {
    const s = binanceSymbol(a);
    return s ? [s] : [];
  });
  if (symbols.length === 0) return;
  try {
    const res = await fetch(
      `${REST_BASE}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
    );
    if (!res.ok) return;
    const rows = (await res.json()) as Ticker[];
    for (const t of rows) tickerBuffer.set(t.s, t);
    flushTickers();
  } catch {
    /* keep last known prices */
  }
}

function startPolling() {
  if (pollTimer) return;
  void pollBinance();
  pollTimer = setInterval(() => void pollBinance(), 15_000);
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

type CoinGeckoRow = {
  id: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  image: string;
};

async function loadCoinGecko() {
  const ids = staticAssets.map((a) => COINGECKO_IDS[a.id] ?? a.id).join(",");
  try {
    const res = await fetch(
      `${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`,
    );
    if (!res.ok) return;
    const rows = (await res.json()) as CoinGeckoRow[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    useMarketStore.getState()._merge((assets) =>
      assets.map((a) => {
        const r = byId.get(COINGECKO_IDS[a.id] ?? a.id);
        if (!r) return a;
        return {
          ...a,
          price: Number.isFinite(r.current_price) ? r.current_price : a.price,
          change24h: r.price_change_percentage_24h_in_currency ?? a.change24h,
          change7d: r.price_change_percentage_7d_in_currency ?? a.change7d,
          marketCap: r.market_cap || a.marketCap,
          volume24h: r.total_volume || a.volume24h,
          image: r.image || a.image,
        };
      }),
    );
    if (useMarketStore.getState().status === "static") {
      useMarketStore.getState()._setStatus("live");
    }
  } catch {
    /* keep static data */
  }
}

async function loadGlobal() {
  try {
    const res = await fetch(`${CG_BASE}/global`);
    if (!res.ok) return;
    const d = (await res.json()).data;
    const btc = d?.market_cap_percentage?.btc;
    const eth = d?.market_cap_percentage?.eth;
    const patch: Partial<GlobalStats> = {};
    if (typeof d?.total_market_cap?.usd === "number") patch.marketCap = d.total_market_cap.usd;
    if (typeof d?.total_volume?.usd === "number") patch.volume24h = d.total_volume.usd;
    if (typeof d?.market_cap_change_percentage_24h_usd === "number")
      patch.marketCapChange = d.market_cap_change_percentage_24h_usd;
    if (typeof btc === "number") patch.btcDominance = btc;
    if (typeof eth === "number") patch.ethDominance = eth;
    if (typeof btc === "number" && typeof eth === "number") patch.otherDominance = 100 - btc - eth;
    if (Object.keys(patch).length > 0) useMarketStore.getState()._setGlobal(patch);
  } catch {
    /* keep static data */
  }
}

async function loadFearGreed() {
  try {
    const res = await fetch(FNG_URL);
    if (!res.ok) return;
    const rows = (await res.json()).data as Array<{ value: string; value_classification: string }>;
    const first = rows[0];
    if (!first) return;
    const patch: Partial<GlobalStats> = {
      fearGreed: parseInt(first.value, 10),
      fearGreedLabel: first.value_classification,
    };
    useMarketStore.getState()._setGlobal(patch);
  } catch {
    /* keep static data */
  }
}

/** Fetch real 15m close prices once so every sparkline is real data. */
async function loadSparks() {
  const entries = await Promise.all(
    staticAssets.map(async (a) => {
      const s = binanceSymbol(a);
      if (!s) return [a.id, null] as const;
      try {
        const res = await fetch(`${REST_BASE}/api/v3/klines?symbol=${s}&interval=15m&limit=32`);
        if (!res.ok) return [a.id, null] as const;
        const rows = (await res.json()) as number[][];
        return [a.id, rows.map((k) => parseFloat(String(k[4])))] as const;
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
 * call connects. Must run on the client only (SSR keeps static data).
 */
export function initRealtime() {
  if (started || typeof window === "undefined") return;
  started = true;
  void loadCoinGecko();
  void loadGlobal();
  void loadFearGreed();
  void loadSparks();
  connect();
  // Refresh slow-moving fundamentals every 5 minutes.
  setInterval(() => {
    void loadCoinGecko();
    void loadGlobal();
    void loadFearGreed();
  }, 5 * 60_000);
}
