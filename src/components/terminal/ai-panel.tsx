import { BrainCircuit, Gauge, Newspaper, Sparkles, TrendingUp } from "lucide-react";
import { fmtPrice, news, type Asset } from "@/lib/market-data";
import { analyzeAsset } from "@/lib/terminal-analysis";
import { cn } from "@/lib/utils";

/**
 * Right-side AI analysis panel — bias, trend, momentum, structure, key levels,
 * confidence and the latest headlines. Compact rows with subtle separators,
 * no heavy cards.
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
        {/* Market bias */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Market Bias
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
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn(
                "h-full rounded-full",
                a.bias === "bullish"
                  ? "bg-up"
                  : a.bias === "bearish"
                    ? "bg-down"
                    : "bg-muted-foreground/60",
              )}
              style={{ width: `${a.confidence}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
            {a.confidence}%
          </p>
        </section>

        {/* Snapshot rows */}
        <section className="space-y-1">
          <Row icon={<TrendingUp className="size-3" />} label="Trend" value={a.trend} />
          <Row icon={<Gauge className="size-3" />} label="Momentum" value={a.momentum} />
          <Row icon={<Sparkles className="size-3" />} label="Structure" value={a.structure} />
        </section>

        {/* Key levels */}
        <section className="rounded-md border border-border bg-surface/60 p-2.5">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Key Levels
          </p>
          <div className="space-y-1.5">
            <LevelRow
              label="Resistance"
              value={fmtPrice(a.resistance)}
              tone="down"
              from={asset.price}
              to={a.resistance}
            />
            <LevelRow
              label="Pivot"
              value={fmtPrice(a.pivot)}
              tone="neutral"
              from={a.resistance}
              to={a.support}
            />
            <LevelRow
              label="Support"
              value={fmtPrice(a.support)}
              tone="up"
              from={a.support}
              to={a.resistance}
            />
          </div>
        </section>

        {/* Confidence */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              AI Confidence
            </p>
            <p className="text-[10px] font-semibold tabular-nums text-foreground">
              {a.confidence}%
            </p>
          </div>
          <div className="space-y-1">
            {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0]
              .map((v) => v <= a.confidence)
              .map((on, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-block h-3 w-1.5 rounded-[1px]",
                    on ? "bg-primary" : "bg-muted/40",
                  )}
                />
              ))}
            <span className="ml-1 inline-block align-middle text-[9px] text-muted-foreground">
              {a.confidence >= 70 ? "High conviction" : a.confidence >= 50 ? "Moderate" : "Low"}
            </span>
          </div>
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

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-1.5 py-1 transition-colors hover:bg-accent/50">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function LevelRow({
  label,
  value,
  tone,
  from,
  to,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "neutral";
  from: number;
  to: number;
}) {
  const pct = from > 0 ? ((to - from) / from) * 100 : 0;
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="w-20 text-muted-foreground">{label}</span>
      <span className="w-16 text-right font-medium tabular-nums text-foreground">{value}</span>
      <span
        className={cn(
          "w-16 text-right text-[9px] tabular-nums",
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-muted-foreground",
        )}
      >
        {pct > 0 ? "+" : ""}
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}
