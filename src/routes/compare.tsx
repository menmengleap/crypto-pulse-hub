import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel, ChangeBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { assets, fmtCompact, fmtPrice } from "@/lib/market-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Assets — Cryptolytic" },
      { name: "description", content: "Compare two crypto assets side by side across price, performance, volume and technicals." },
      { property: "og:title", content: "Compare Assets — Cryptolytic" },
      { property: "og:description", content: "Side-by-side crypto asset comparison for relative strength analysis." },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const [a, setA] = useState("BTC");
  const [b, setB] = useState("ETH");
  const left = assets.find((x) => x.symbol === a) ?? assets[0]!;
  const right = assets.find((x) => x.symbol === b) ?? assets[1]!;

  const rows: [string, string, string][] = [
    ["Price", fmtPrice(left.price), fmtPrice(right.price)],
    ["24h change", `${left.change24h}%`, `${right.change24h}%`],
    ["7d change", `${left.change7d}%`, `${right.change7d}%`],
    ["Market cap", fmtCompact(left.marketCap), fmtCompact(right.marketCap)],
    ["Volume 24h", fmtCompact(left.volume24h), fmtCompact(right.volume24h)],
    ["RSI (14)", left.rsi.toFixed(1), right.rsi.toFixed(1)],
    ["Trend", left.trend, right.trend],
    ["Momentum", left.momentum, right.momentum],
    ["Sector", left.sector, right.sector],
  ];

  return (
    <AppShell title="Compare" subtitle="Relative strength between two assets">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { asset: left, value: a, set: setA },
            { asset: right, value: b, set: setB },
          ].map(({ asset, value, set }, i) => (
            <Panel key={i}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Select value={value} onValueChange={set}>
                  <SelectTrigger className="h-9 w-[160px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((x) => (
                      <SelectItem key={x.id} value={x.symbol}>
                        {x.pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ChangeBadge value={asset.change24h} />
              </div>
              <p className="num mt-4 text-3xl font-semibold tracking-tight">{fmtPrice(asset.price)}</p>
              <Sparkline data={asset.spark} positive={asset.change24h >= 0} className="mt-3 h-40" strokeWidth={2} />
            </Panel>
          ))}
        </div>

        <Panel title="Metric comparison" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Metric</th>
                <th className="px-4 py-2.5 text-right font-medium">{left.symbol}</th>
                <th className="px-4 py-2.5 text-right font-medium">{right.symbol}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, l, r]) => (
                <tr key={k} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{k}</td>
                  <td className={cn("num px-4 py-3 text-right", k.includes("change") && (parseFloat(l) >= 0 ? "text-up" : "text-down"))}>{l}</td>
                  <td className={cn("num px-4 py-3 text-right", k.includes("change") && (parseFloat(r) >= 0 ? "text-up" : "text-down"))}>{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </AppShell>
  );
}
