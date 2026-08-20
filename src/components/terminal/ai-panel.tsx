import { BrainCircuit, Newspaper } from "lucide-react";
import { DOWN_COLOR, MiniChart, MUTED_COLOR, UP_COLOR } from "@/components/chart/mini-chart";
import { fmtPrice, news, type Asset } from "@/lib/market-data";
import { analyzeAsset } from "@/lib/terminal-analysis";
import { cn } from "@/lib/utils";

/**
 * Right-side AI analysis panel — price structure, signal strength and
 * confidence are rendered as lightweight-charts widgets; the summary and
 * latest headlines stay as text.
 */
export function AIPanel({ asset }: { asset: Asset }) {
  const a = analyzeAsset(asset);

  const biasColor =
    a.bias === "bullish" ? "text-up" : a.bias === "bearish" ? "text-down" : "text-muted-foreground";
  const biasBg =
    a.bias === "bullish"
      ? "bg-up/10 border-up/25"
      : a.bias === "bearish"
        ? "bg-down/10 border-down/25"
        : "bg-muted/40 border-border";

  const biasHex = a.bias === "bullish" ? UP_COLOR : a.bias === "bearish" ? DOWN_COLOR : MUTED_COLOR;

  // Scale the spark line so its last point lands on the live price, letting the
  // support/pivot/resistance price lines overlay the price path meaningfully.
  const spark = asset.spark;
  const lastSpark = spark.at(-1) ?? asset.price;
  const scaledSpark = spark.map((v) => v * (asset.price / lastSpark));

  const trendStrength = a.trend.includes("Strong Bull")
    ? 1
    : a.trend.includes("Bull")
      ? 0.5
      : a.trend.includes("Strong Bear")
        ? -1
        : a.trend.includes("Bear")
          ? -0.5
          : 0;
  const momentumStrength = a.momentum === "Strong" ? 1 : a.momentum === "Moderate" ? 0 : -1;
  const rsiStrength = Math.max(-1, Math.min(1, (asset.rsi - 50) / 50));

  const signals = [
    { label: "Trend", value: a.trend, strength: trendStrength },
    { label: "Momentum", value: a.momentum, strength: momentumStrength },
    { label: "RSI", value: asset.rsi.toFixed(1), strength: rsiStrength },
  ];

  const conviction =
    a.confidence >= 70 ? "High conviction" : a.confidence >= 50 ? "Moderate" : "Low";
  const confidenceColor =
    a.confidence >= 70 ? UP_COLOR : a.confidence >= 50 ? "#f7931a" : DOWN_COLOR;

  const headlines = news
    .filter((n) => n.assets.includes(asset.symbol))
    .concat(news.filter((n) => !n.assets.includes(asset.symbol)))
    .slice(0, 4);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto text-[11px]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="grid size-6 place-items-center rounded-md border border-primary/25 bg-primary/10 text-primary">
          <BrainCircuit className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI Market Analysis
          </p>
          <p className="truncate font-medium text-foreground">
            {asset.pair}
            <span className="ml-1 text-muted-foreground">· {a.trend}</span>
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 px-3 py-3">
        {/* Price structure — spark path + key levels */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Price Structure
            </p>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                biasBg,
                biasColor,
              )}
            >
              {a.bias}
            </span>
          </div>
          <MiniChart
            data={scaledSpark}
            color={biasHex}
            height={128}
            priceLines={[
              { price: a.resistance, color: DOWN_COLOR, title: "Resistance" },
              { price: a.pivot, color: MUTED_COLOR, title: "Pivot" },
              { price: a.support, color: UP_COLOR, title: "Support" },
            ]}
          />
          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-muted-foreground">
            <span>
              <span className="text-up">S</span> {fmtPrice(a.support)}
            </span>
            <span>
              <span className="text-muted-foreground">P</span> {fmtPrice(a.pivot)}
            </span>
            <span>
              <span className="text-down">R</span> {fmtPrice(a.resistance)}
            </span>
          </div>
        </section>

        {/* Signal strength bars */}
        <section>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Signals
          </p>
          <MiniChart
            data={signals.map((s, i) => ({
              time: i,
              value: s.strength,
              color: s.strength >= 0 ? UP_COLOR : DOWN_COLOR,
            }))}
            bars
            height={72}
            range={{ min: -1, max: 1 }}
          />
          <div className="mt-1 flex justify-between gap-2">
            {signals.map((s) => (
              <div key={s.label} className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="truncate font-medium text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
            Structure: {a.structure}
          </p>
        </section>

        {/* Confidence meter */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Confidence
            </p>
            <p
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: confidenceColor }}
            >
              {a.confidence}% · {conviction}
            </p>
          </div>
          <MiniChart
            data={[
              { time: 0, value: a.confidence },
              { time: 1, value: a.confidence },
            ]}
            bars
            track={100}
            color={confidenceColor}
            height={40}
            range={{ min: 0, max: 100 }}
          />
        </section>

        <p className="rounded-md border border-border bg-surface/40 p-2.5 leading-relaxed text-muted-foreground">
          {a.summary}
        </p>
      </div>

      {/* News */}
      <div className="shrink-0 border-t border-border">
        <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Newspaper className="size-3" /> Latest Market News
        </p>
        <div className="space-y-2 px-3 pb-3">
          {headlines.map((n) => (
            <a key={n.id} href="#" className="block">
              <p className="line-clamp-2 text-[11px] leading-snug text-foreground/90 transition-colors hover:text-primary">
                {n.title}
              </p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {n.source} · {n.time} ·{" "}
                <span
                  className={cn(
                    "font-medium",
                    n.sentiment === "Bullish"
                      ? "text-up"
                      : n.sentiment === "Bearish"
                        ? "text-down"
                        : "text-muted-foreground",
                  )}
                >
                  {n.sentiment}
                </span>
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
