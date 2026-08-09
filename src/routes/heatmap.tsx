import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Market Heatmap — Cryptolytic" },
      { name: "description", content: "Interactive crypto market heatmap grouped by sector with 24h performance and market cap." },
      { property: "og:title", content: "Market Heatmap — Cryptolytic" },
      { property: "og:description", content: "See where money is moving across crypto sectors at a glance." },
    ],
  }),
  component: HeatmapPage,
});

const groups = ["Bitcoin", "Ethereum", "Layer 1", "Layer 2", "DeFi", "AI", "Meme", "Gaming"];

function HeatmapPage() {
  const assets = useLiveAssets();
  return (
    <AppShell title="Market Heatmap" subtitle="24h performance by sector">
      <div className="space-y-4">
        {groups.map((g) => {
          const items = assets.filter((a) => a.sector === g);
          if (items.length === 0) return null;
          return (
            <Panel key={g} title={g} description={`${items.length} assets`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {items.map((a) => {
                  const up = a.change24h >= 0;
                  const intensity = Math.min(Math.abs(a.change24h) / 8, 1) * 40 + 8;
                  return (
                    <Tooltip key={a.id}>
                      <TooltipTrigger asChild>
                        <div
                          className="rounded-xl border border-border p-4 transition-transform hover:scale-[1.02]"
                          style={{ background: `color-mix(in oklab, var(--${up ? "up" : "down"}) ${intensity}%, transparent)` }}
                        >
                          <p className="truncate text-sm font-semibold">{a.symbol}</p>
                          <p className={cn("num mt-1 text-lg font-semibold", up ? "text-up" : "text-down")}>{fmtPct(a.change24h)}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{fmtCompact(a.marketCap)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {a.name} · {fmtPrice(a.price)} · Vol {fmtCompact(a.volume24h)}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
