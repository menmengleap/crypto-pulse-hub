import { create } from "zustand";
import { api, API_ORIGIN } from "./api";

/**
 * Traditional markets — forex, indices, the Dollar Index, commodities, CME
 * futures and US treasury yields.
 *
 * All data flows through the backend (User → Frontend → Backend → provider):
 *   TWELVE DATA   realtime WebSocket + REST quotes for forex and gold
 *   Yahoo Finance indices (SPX …), DXY, futures (ES …), bonds (US10Y …)
 *   Alpha Vantage treasury yield history, US inflation, commodity history
 *
 * The backend broadcasts a `tradfi_snapshot` over /api/ws/markets every
 * ~500ms; this layer applies those frames with a 250ms trailing throttle and
 * falls back to REST polling (/api/live/tradfi) for hydration and outages.
 * Historical data is REST-only (/api/live/tradfi/history), per the spec.
 */

export type TradCategory = "forex" | "index" | "dollar" | "commodity" | "futures" | "bond";

export type TradQuote = {
  symbol: string;
  name: string;
  category: TradCategory;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  spark: number[];
  source: string;
  currency: string;
  digits: number;
  live: boolean;
  updatedAt: string;
};

export type MacroPoint = { date: string; value: number };

export type TradMacro = {
  treasury: Record<string, MacroPoint[]>;
  inflation: MacroPoint[];
  commodities: Record<string, MacroPoint[]>;
  updatedAt?: string;
};

type TradFiStatus = "static" | "live" | "offline";

/* ------------------------------------------------------------------------- */
/* Static seeds (SSR + first paint before the first live frame)              */
/* ------------------------------------------------------------------------- */

function seededSpark(seed: number, price: number, len = 48): number[] {
  let x = (seed * 2654435761) % 100003;
  const rand = () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return (x % 1000) / 1000;
  };
  const out: number[] = [];
  let v = price * (0.995 + rand() * 0.01);
  for (let i = 0; i < len - 1; i++) {
    out.push(Number(v.toFixed(6)));
    v *= 1 + (rand() - 0.48) * 0.003;
  }
  out.push(price);
  return out;
}

type SeedDef = [
  symbol: string,
  name: string,
  category: TradCategory,
  price: number,
  digits: number,
  seed: number,
];

const SEED_DEFS: SeedDef[] = [
  // Forex
  ["EUR/USD", "Euro / US Dollar", "forex", 1.15347, 5, 11],
  ["GBP/USD", "British Pound / US Dollar", "forex", 1.2735, 5, 13],
  ["USD/JPY", "US Dollar / Japanese Yen", "forex", 155.28, 3, 17],
  ["USD/CHF", "US Dollar / Swiss Franc", "forex", 0.9024, 5, 19],
  ["AUD/USD", "Australian Dollar / US Dollar", "forex", 0.6582, 5, 23],
  ["USD/CAD", "US Dollar / Canadian Dollar", "forex", 1.372, 5, 29],
  ["NZD/USD", "New Zealand Dollar / US Dollar", "forex", 0.6114, 5, 31],
  ["EUR/GBP", "Euro / British Pound", "forex", 0.8512, 5, 37],
  ["EUR/JPY", "Euro / Japanese Yen", "forex", 163.42, 3, 41],
  ["GBP/JPY", "British Pound / Japanese Yen", "forex", 193.51, 3, 43],
  // Indices
  ["SPX", "S&P 500", "index", 5438.66, 2, 47],
  ["NDX", "Nasdaq 100", "index", 18924.52, 2, 53],
  ["DJI", "Dow Jones", "index", 38912.3, 2, 59],
  ["RUT", "Russell 2000", "index", 2085.4, 2, 61],
  ["VIX", "CBOE Volatility", "index", 17.42, 2, 67],
  // Dollar index
  ["DXY", "US Dollar Index", "dollar", 103.42, 3, 71],
  // Commodities
  ["XAU/USD", "Gold (Spot)", "commodity", 4372.23, 2, 73],
  ["XAG/USD", "Silver (Spot)", "commodity", 31.42, 3, 79],
  ["WTI", "Crude Oil WTI", "commodity", 78.43, 2, 83],
  ["BRENT", "Brent Crude", "commodity", 82.15, 2, 89],
  ["NATURAL GAS", "Natural Gas", "commodity", 2.612, 3, 97],
  // CME futures
  ["ES", "S&P 500 E-mini", "futures", 5436.75, 2, 101],
  ["NQ", "Nasdaq 100 E-mini", "futures", 18940.0, 2, 103],
  ["YM", "Dow E-mini", "futures", 38900.0, 2, 107],
  ["RTY", "Russell 2000 E-mini", "futures", 2088.0, 2, 109],
  ["GC", "Gold Futures", "futures", 4390.2, 2, 113],
  ["SI", "Silver Futures", "futures", 31.5, 3, 127],
  ["CL", "Crude Oil Futures", "futures", 78.4, 2, 131],
  ["NG", "Natural Gas Futures", "futures", 2.61, 3, 137],
  // Bonds
  ["US10Y", "US 10Y Treasury", "bond", 4.31, 3, 139],
  ["US30Y", "US 30Y Treasury", "bond", 4.68, 3, 149],
  ["US02Y", "US 2Y Treasury", "bond", 4.14, 3, 151],
];

export const staticTradQuotes: TradQuote[] = SEED_DEFS.map(
  ([symbol, name, category, price, digits, seed]) => ({
    symbol,
    name,
    category,
    price,
    prevClose: price,
    change: 0,
    changePct: 0,
    high: price,
    low: price,
    spark: seededSpark(seed, price),
    source: "static",
    currency: category === "bond" ? "%" : "USD",
    digits,
    live: false,
    updatedAt: "",
  }),
);

/* ------------------------------------------------------------------------- */
/* Store                                                                     */
/* ------------------------------------------------------------------------- */

type TradFiState = {
  quotes: TradQuote[];
  macro: TradMacro;
  status: TradFiStatus;
  _setQuotes: (quotes: TradQuote[]) => void;
  _setMacro: (macro: TradMacro) => void;
  _setStatus: (status: TradFiStatus) => void;
};

export const useTradFiStore = create<TradFiState>((set) => ({
  quotes: staticTradQuotes,
  macro: { treasury: {}, inflation: [], commodities: {} },
  status: "static",
  _setQuotes: (quotes) => set({ quotes }),
  _setMacro: (macro) => set({ macro }),
  _setStatus: (status) => set({ status }),
}));

export function useTradFiQuotes(): TradQuote[] {
  return useTradFiStore((s) => s.quotes);
}

export function useTradFiMacro(): TradMacro {
  return useTradFiStore((s) => s.macro);
}

/* ------------------------------------------------------------------------- */
/* Merge + throttling                                                        */
/* ------------------------------------------------------------------------- */

function pushPrice(spark: number[], price: number): number[] {
  const next = [...spark, price];
  return next.length > 64 ? next.slice(next.length - 64) : next;
}

/** Merge a backend snapshot into the current quotes, keeping order + seeds. */
function mergeQuotes(prev: TradQuote[], next: TradQuote[]): TradQuote[] {
  const bySymbol = new Map(next.map((q) => [q.symbol, q]));
  return prev.map((q) => {
    const n = bySymbol.get(q.symbol);
    if (!n || !Number.isFinite(n.price) || n.price <= 0) return q;
    const spark = n.spark && n.spark.length >= 2 ? n.spark : pushPrice(q.spark, n.price);
    return {
      ...q,
      price: n.price,
      prevClose: n.prevClose > 0 ? n.prevClose : q.prevClose,
      change: Number.isFinite(n.change) ? n.change : q.change,
      changePct: Number.isFinite(n.changePct) ? n.changePct : q.changePct,
      high: n.high > 0 ? n.high : q.high,
      low: n.low > 0 ? n.low : q.low,
      spark,
      source: n.source || q.source,
      digits: n.digits > 0 ? n.digits : q.digits,
      live: Boolean(n.live),
      updatedAt: n.updatedAt || q.updatedAt,
    };
  });
}

// Trailing-edge throttle (250ms): WebSocket frames arrive at ~500ms from the
// backend, and this collapses any burst (e.g. two frames racing a reconnect)
// so React never re-renders more than 4×/s.
const THROTTLE_MS = 250;
let pendingBatch: TradQuote[] | null = null;
let flushTimer: number | null = null;

function applyServerQuotes(next: TradQuote[]) {
  pendingBatch = next;
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    const batch = pendingBatch;
    pendingBatch = null;
    if (!batch) return;
    const state = useTradFiStore.getState();
    state._setQuotes(mergeQuotes(state.quotes, batch));
    if (state.status === "static") state._setStatus("live");
  }, THROTTLE_MS);
}

/* ------------------------------------------------------------------------- */
/* Polling + WebSocket                                                       */
/* ------------------------------------------------------------------------- */

const REST_POLL_MS = 10_000;
const MACRO_POLL_MS = 5 * 60_000;

let started = false;
let ws: WebSocket | null = null;

function apiWsUrl(): string {
  const path = "/api/ws/markets";
  if (API_ORIGIN) return `${API_ORIGIN.replace(/^http/, "ws")}${path}`;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }
  return "";
}

async function pollTradFi() {
  try {
    const quotes = await api.get<TradQuote[]>("/live/tradfi");
    const state = useTradFiStore.getState();
    state._setQuotes(mergeQuotes(state.quotes, quotes));
    state._setStatus("live");
  } catch {
    /* keep last known quotes */
  }
}

async function pollMacro() {
  try {
    const macro = await api.get<TradMacro>("/live/tradfi/macro");
    if (macro && Array.isArray(macro.inflation)) {
      useTradFiStore.getState()._setMacro(macro);
    }
  } catch {
    /* keep last known macro */
  }
}

function connectTradFiWS() {
  let socket: WebSocket;
  try {
    socket = new WebSocket(apiWsUrl());
  } catch {
    return;
  }
  ws = socket;
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as { type?: string; data?: TradQuote[] };
      if (msg.type === "tradfi_snapshot" && Array.isArray(msg.data)) {
        applyServerQuotes(msg.data);
      }
    } catch {
      /* malformed frame — ignore */
    }
  };
  socket.onclose = () => {
    if (ws === socket) ws = null;
    window.setTimeout(() => {
      if (started) connectTradFiWS();
    }, 5000);
  };
  socket.onerror = () => {
    try {
      socket.close();
    } catch {
      /* noop */
    }
  };
}

/**
 * Kick off the traditional-markets stream. Client-side only; SSR keeps the
 * static seeds. Safe to call multiple times.
 */
export function initTradFi() {
  if (started || typeof window === "undefined") return;
  started = true;
  void pollTradFi();
  void pollMacro();
  connectTradFiWS();
  window.setInterval(() => void pollTradFi(), REST_POLL_MS);
  window.setInterval(() => void pollMacro(), MACRO_POLL_MS);
}
