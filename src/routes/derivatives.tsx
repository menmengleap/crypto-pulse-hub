import { createFileRoute } from "@tanstack/react-router";
import { Activity, Layers, Percent, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel, StatCard, ChangeBadge, AssetRowCell } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { fmtCompact, fmtPrice } from "@/lib/market-data";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/derivatives")({
  head: () => ({
    meta: [
      { title: "Derivatives Market — Cryptolytic" },
      { name: "description", content: "Perpetual futures analytics: open interest, funding rates, long/short ratio and liquidation context." },
      { property: "og:title", content: "Derivatives Market — Cryptolytic" },
      { property: "og:description", content: "Open interest, funding and positioning across crypto perpetuals." },
    ],
  }),
  component: DerivativesPage,
});

function DerivativesPage() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const perps = assets.slice(0, 8).map((a, i) => ({
    asset: a,
    oi: a.marketCap * 0.028 * (1 + i * 0.05),
    funding: ((i % 5) - 2) * 0.0037 + 0.0042,
    ls: 1.12 - i * 0.06,
    liq24h: 40000000 + i * 18000000,
  }));

  return (
    <AppShell title="Derivatives Market" subtitle="Perpetual futures positioning and flow">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Open Interest" value={fmtCompact(globalStats.openInterest)} change={3.12} hint="All perpetuals" icon={<Layers className="size-4" />} accent="primary" />
          <StatCard label="Avg Funding (8h)" value="+0.0094%" change={0.42} hint="Longs pay shorts" icon={<Percent className="size-4" />} accent="btc" />
          <StatCard label="24h Liquidations" value="$412.8M" change={-12.4} hint="68% longs" icon={<Activity className="size-4" />} accent="down" />
          <StatCard label="Long / Short Ratio" value="1.08" change={1.1} hint="Slightly long skewed" icon={<TrendingUp className="size-4" />} accent="primary" />
        </div>

        <Panel title="Perpetual markets" description="Open interest, funding and positioning" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Contract</th>
                  <th className="px-4 py-2.5 text-right font-medium">Mark price</th>
                  <th className="px-4 py-2.5 text-right font-medium">24h</th>
                  <th className="px-4 py-2.5 text-right font-medium">Open interest</th>
                  <th className="px-4 py-2.5 text-right font-medium">Funding 8h</th>
                  <th className="px-4 py-2.5 text-right font-medium">L/S ratio</th>
                  <th className="px-4 py-2.5 text-right font-medium">Liquidations</th>
                </tr>
              </thead>
              <tbody>
                {perps.map(({ asset, oi, funding, ls, liq24h }) => (
                  <tr key={asset.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-3"><AssetRowCell asset={asset} /></td>
                    <td className="num px-4 py-3 text-right">{fmtPrice(asset.price)}</td>
                    <td className="px-4 py-3 text-right"><ChangeBadge value={asset.change24h} /></td>
                    <td className="num px-4 py-3 text-right text-muted-foreground">{fmtCompact(oi)}</td>
                    <td className={cn("num px-4 py-3 text-right", funding >= 0 ? "text-up" : "text-down")}>
                      {funding >= 0 ? "+" : ""}
                      {(funding * 100).toFixed(4)}%
                    </td>
                    <td className="num px-4 py-3 text-right">{ls.toFixed(2)}</td>
                    <td className="num px-4 py-3 text-right text-muted-foreground">{fmtCompact(liq24h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Open interest trend" description="Aggregate, 30 days">
            <Sparkline data={assets[0]?.spark ?? []} positive className="h-48" strokeWidth={2} />
          </Panel>
          <Panel title="Funding rate distribution" description="Across top contracts">
            <div className="space-y-3">
              {perps.slice(0, 6).map((p) => {
                const pct = Math.min(Math.abs(p.funding * 100) / 0.02, 1) * 100;
                return (
                  <div key={p.asset.id}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                      <span className="truncate text-muted-foreground">{p.asset.symbol} perpetual</span>
                      <span className={cn("num", p.funding >= 0 ? "text-up" : "text-down")}>{(p.funding * 100).toFixed(4)}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", p.funding >= 0 ? "bg-up" : "bg-down")} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
