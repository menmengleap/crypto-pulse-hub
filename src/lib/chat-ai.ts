import { api, finnhubApi, type FinnhubNewsHeadline } from "@/lib/api";
import { fmtCompact, fmtPrice, type Asset, type GlobalStats } from "@/lib/market-data";

/**
 * The Advanced Chat assistant — a deterministic, rule-based responder that
 * answers market questions from the same live data the console uses. It is
 * intentionally local (no external LLM) so it always answers instantly; the
 * only network calls are the backend's Finnhub news feed and the server-side
 * desk-note analyzer (POST /api/ai/analyze), which also saves analyses to the
 * user's library.
 */

export type ReplyKind =
  | "help"
  | "fallback"
  | "error"
  | "asset"
  | "movers"
  | "global"
  | "fear"
  | "dominance"
  | "cycle"
  | "news"
  | "compare"
  | "desknote";

export type ChatReply = {
  kind: ReplyKind;
  text: string;
  payload?: unknown;
};

export type ChatMessage = ChatReply & {
  id: string;
  role: "user" | "assistant";
  createdAt: number;
};

export type ChatContext = {
  assets: Asset[];
  global: GlobalStats;
};

// ---------------------------------------------------------------------------
// Symbol detection
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find asset symbols mentioned in a message (word-boundary, order-preserving). */
export function findSymbols(text: string, assets: Asset[]): string[] {
  const upper = text.toUpperCase();
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const a of assets) {
    const sym = a.symbol.toUpperCase();
    const matchSymbol = new RegExp(`\\b${escapeRegExp(sym)}\\b`).test(upper);
    const name = a.name.toLowerCase();
    const matchName = name.length >= 3 && lower.includes(name);
    if (matchSymbol || matchName) found.push(a.symbol);
  }
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(unix: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - unix);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function localDeskNote(a: Asset): string {
  const dir = a.change24h >= 0 ? "up" : "down";
  const bias =
    a.change24h >= 0 && a.rsi > 60
      ? "bullish"
      : a.change24h < 0 && a.rsi < 40
        ? "bearish"
        : "neutral";
  return `${a.symbol} trades at ${fmtPrice(a.price)}, ${dir} ${Math.abs(a.change24h).toFixed(2)}% over 24h with a ${a.trend.toLowerCase()} trend and ${a.momentum.toLowerCase()} momentum. RSI (14) is ${a.rsi.toFixed(1)}; 24h volume is ${fmtCompact(a.volume24h)} on a ${fmtCompact(a.marketCap)} market cap. ${bias === "bullish" ? "Bias is bullish — buyers are in control above the 24h midpoint." : bias === "bearish" ? "Bias is bearish — sellers pressing below the 24h midpoint." : "Bias is neutral — price is balanced until a breakout resolves."} (Local read — the server desk note was unavailable.)`;
}

// ---------------------------------------------------------------------------
// Responder
// ---------------------------------------------------------------------------

export async function respondTo(raw: string, ctx: ChatContext): Promise<ChatReply> {
  const text = raw.trim().replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  const assets = ctx.assets;
  const syms = findSymbols(text, assets);
  const primary = assets.find((a) => a.symbol === syms[0]);

  // Help / capabilities
  if (
    /help|what can you do|how do you work|capabilit|what do you do|commands|start over/.test(lower)
  ) {
    return {
      kind: "help",
      text: "I read the market in real time. Ask about any asset's price, the biggest movers, fear & greed, bitcoin dominance, the market cycle, news, or compare two assets — or say 'analyze BTC' for a server-side desk note.",
    };
  }

  // News (deliberately narrow — "latest price of BTC" must not become news)
  if (/news|headline|happening|breaking|what'?s? new/.test(lower)) {
    try {
      const items = await finnhubApi.news();
      return {
        kind: "news",
        text: items.length ? "Latest headlines across global markets." : "No headlines right now.",
        payload: { items: items.slice(0, 6) },
      };
    } catch {
      return {
        kind: "news",
        text: "Headlines are temporarily unavailable — try again in a moment.",
        payload: { items: [] },
      };
    }
  }

  // Fear & Greed
  if (/fear.*greed|greed.*fear|market emotion|emotion index/.test(lower)) {
    return {
      kind: "fear",
      text: `The index reads ${ctx.global.fearGreed} · ${ctx.global.fearGreedLabel} right now${ctx.global.fearGreed > ctx.global.fearGreedPrev ? ", rising from" : ", down from"} ${ctx.global.fearGreedPrev} yesterday.`,
      payload: { global: ctx.global },
    };
  }

  // Dominance
  if (/dominance|capital rotation/.test(lower)) {
    return {
      kind: "dominance",
      text: `Bitcoin holds ${ctx.global.btcDominance}% dominance with Ethereum at ${ctx.global.ethDominance}% — capital is flowing through BTC first.`,
      payload: { global: ctx.global },
    };
  }

  // Cycle
  if (/cycle|which phase|what phase|where are we/.test(lower)) {
    return {
      kind: "cycle",
      text: "Structure remains expansionary — higher highs, dominance grinding up, breadth still narrow. Euphoria conditions have not appeared yet.",
      payload: { global: ctx.global },
    };
  }

  // Compare
  if (/\bcompare\b| vs |versus/.test(lower)) {
    const a = assets.find((x) => x.symbol === (syms[0] ?? "BTC")) ?? assets[0]!;
    const b = assets.find((x) => x.symbol === (syms[1] ?? "ETH")) ?? assets[1]!;
    return {
      kind: "compare",
      text: `Comparing ${a.symbol} against ${b.symbol} side by side.`,
      payload: { a, b },
    };
  }

  // Movers
  if (/mover|gainers?|losers?|top|best|worst|leading|performer|breadth/.test(lower)) {
    const movers = [...assets].sort((x, y) => y.change24h - x.change24h).slice(0, 6);
    return {
      kind: "movers",
      text:
        "The biggest 24h movers right now, led by " + movers.map((m) => m.symbol).join(", ") + ".",
      payload: { movers },
    };
  }

  // Desk note — explicit analyze intent on an asset (server-side, saved). Only
  // the small output payload is kept (never the raw OHLCV input) so chat
  // history stays light in localStorage.
  if (primary && /analyz|analysis|desk note|outlook|bias|signal|structure|read on/.test(lower)) {
    try {
      const analysis = await api.post<DeskNoteAnalysis>("/ai/analyze", {
        symbol: primary.symbol,
        timeframe: "4h",
      });
      return {
        kind: "desknote",
        text: `Server-side desk note for ${primary.symbol} on the 4H chart.`,
        payload: {
          desknote: {
            symbol: analysis.symbol,
            timeframe: analysis.timeframe,
            output: analysis.output,
          },
        },
      };
    } catch {
      return { kind: "desknote", text: localDeskNote(primary), payload: { asset: primary } };
    }
  }

  // Specific asset
  if (primary) {
    return {
      kind: "asset",
      text: `${primary.symbol} is at ${fmtPrice(primary.price)} — ${primary.change24h >= 0 ? "up" : "down"} ${Math.abs(primary.change24h).toFixed(2)}% over 24h with ${primary.momentum.toLowerCase()} momentum.`,
      payload: { asset: primary },
    };
  }

  // Global overview
  if (/market|overview|global|cap|volume|total|how'?s? (the )?market|everything/.test(lower)) {
    return {
      kind: "global",
      text: "The market at a glance: total capitalization, 24h volume, BTC dominance and sentiment.",
      payload: { global: ctx.global },
    };
  }

  return {
    kind: "fallback",
    text: 'I couldn\'t quite parse that. Try asking about a specific asset ("How is ETH doing?"), the top movers, fear & greed, bitcoin dominance, the market cycle, compare two assets, or the latest news.',
  };
}

export { timeAgo };

/** Minimal shape of the backend's desk-note analysis record. */
type DeskNoteAnalysis = {
  symbol: string;
  timeframe: string;
  output: Record<string, unknown>;
};
