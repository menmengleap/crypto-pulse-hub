import type { Asset } from "@/lib/market-data";

/**
 * Terminal AI analysis — a deterministic, rule-based read derived from the
 * same live data the chart renders (price, 24h change, RSI, trend, momentum).
 *
 * The shape mirrors the backend desk-note output (`POST /api/ai/analyze`) so
 * the AI sidebar renders identically whether the note comes from the server
 * or is computed locally on the client.
 */

export type TerminalAnalysis = {
  bias: "bullish" | "bearish" | "neutral";
  confidence: number;
  trend: string;
  momentum: string;
  structure: string;
  resistance: number;
  support: number;
  pivot: number;
  summary: string;
};

/** Deterministic analysis for one asset (always available, instant). */
export function analyzeAsset(a: Asset): TerminalAnalysis {
  const rsi = a.rsi;
  const chg = a.change24h;
  const up = chg >= 0;

  const bias: TerminalAnalysis["bias"] =
    rsi >= 58 && up ? "bullish" : rsi <= 42 && !up ? "bearish" : "neutral";

  // Confidence: 50 base, ± RSI pull, ± move magnitude, trend/momentum bonus.
  let confidence = 50;
  confidence += Math.round((rsi - 50) * 0.55);
  confidence += Math.round(Math.min(Math.abs(chg) * 1.6, 16));
  if (a.trend.includes("Strong")) confidence += 6;
  else if (a.trend.includes("Bear") || a.trend.includes("Bull")) confidence += 3;
  if (a.momentum === "Strong") confidence += 4;
  else if (a.momentum === "Weak") confidence -= 4;
  confidence = Math.max(38, Math.min(94, confidence));

  // Structure from trend + momentum.
  const structure =
    a.trend.includes("Bull") && a.momentum === "Strong"
      ? "Higher High / Higher Low"
      : a.trend.includes("Bear") && a.momentum === "Weak"
        ? "Lower High / Lower Low"
        : a.trend.includes("Bull")
          ? "Higher Low sequence"
          : a.trend.includes("Bear")
            ? "Lower High sequence"
            : "Range / balanced";

  // Key levels — pivot = price, bands scale with move size & volatility.
  const band = a.price * (0.004 + Math.min(Math.abs(chg) / 220, 0.016));
  const pivot = a.price;
  const resistance = pivot + band;
  const support = pivot - band;

  const biasText =
    bias === "bullish"
      ? "Buyers are in control — price holds above the 24h midpoint with momentum confirming."
      : bias === "bearish"
        ? "Sellers are pressing — price trades below the 24h midpoint with momentum fading."
        : "Balanced tape — price is consolidating until a breakout resolves direction.";

  const summary = `${a.symbol} trades at $${a.price.toLocaleString("en-US", { maximumFractionDigits: a.price < 1 ? 4 : 2 })}, ${up ? "up" : "down"} ${Math.abs(chg).toFixed(2)}% over 24h with a ${a.trend.toLowerCase()} trend and ${a.momentum.toLowerCase()} momentum. RSI (14) is ${rsi.toFixed(1)}. ${biasText} Watch $${resistance.toLocaleString("en-US", { maximumFractionDigits: 2 })} on the upside and $${support.toLocaleString("en-US", { maximumFractionDigits: 2 })} below as the immediate reaction zone.`;

  return {
    bias,
    confidence,
    trend: a.trend,
    momentum: a.momentum,
    structure,
    resistance,
    support,
    pivot,
    summary,
  };
}
