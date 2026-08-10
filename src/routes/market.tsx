import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BarChart3, Coins, Gauge, PieChart, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Panel,
  StatCard,
  SentimentGauge,
  ChangeBadge,
  TrendBadge,
  AssetRowCell,
} from "@/components/market/ui";
import { TickerBoard } from "@/components/market/ticker-board";
import { Sparkline } from "@/components/market/sparkline";
import {
  fmtCompact,
  fmtPct,
  fmtPrice,
  marketCapHistory,
  marketCyclePhases,
} from "@/lib/market-data";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market Overview — Cryptolytic" },
      {
        name: "description",
        content:
          "Live markets across crypto, stocks and forex: prices, market cap, dominance, sentiment, open interest and trending assets.",
      },
      { property: "og:title", content: "Market Overview — Cryptolytic" },
      {
        property: "og:description",
        content:
          "A dense dashboard of crypto, stock and forex market structure, sentiment and flows.",
      },
    ],
  }),
  component: MarketOverview,
});

function MarketOverview() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const trending = [...assets].sort((a, b) => b.change24h - a.change24h).slice(0, 6);
  const heat = assets.slice(0, 12);

  return (
    <AppShell title="Market Overview" subtitle="Crypto, stocks & forex — real-time market flows">
      <div className="space-y-4">
        <TickerBoard />

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Crypto Market Cap"
            description="Total capitalization, last 90 days"
            action={<ChangeBadge value={globalStats.marketCapChange} />}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="num text-3xl font-semibold tracking-tight">
                {fmtCompact(globalStats.marketCap)}
              </p>
              <p className="text-xs text-muted-foreground">
                24h volume {fmtCompact(globalStats.volume24h)}
              </p>
            </div>
            <Sparkline
              data={marketCapHistory.map((d) => d.value)}
              positive
              dot
              className="mt-4 h-44"
              strokeWidth={2}
            />
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Panel
              title="Fear & Greed"
              description="Updated hourly"
              action={
                <Link to="/fear-greed" className="text-xs text-primary hover:underline">
                  Details
                </Link>
              }
            >
              <SentimentGauge
                score={globalStats.fearGreed}
                label={globalStats.fearGreedLabel}
                size={200}
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Previous close {globalStats.fearGreedPrev} ·{" "}
                {globalStats.fearGreed > globalStats.fearGreedPrev ? "rising" : "falling"}
              </p>
            </Panel>

            <Panel
              title="Market Sentiment"
              description="Composite of flows, funding and social"
              action={
                <Link to="/sentiment" className="text-xs text-primary hover:underline">
                  Details
                </Link>
              }
            >
              <div className="space-y-3">
                {[
                  ["Spot flows", 72, "Net buying"],
                  ["Derivatives funding", 58, "Mildly long"],
                  ["Social momentum", 64, "Elevated"],
                  ["On-chain accumulation", 81, "Strong"],
                ].map(([label, v, note]) => (
                  <div key={label as string}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                      <span className="truncate text-muted-foreground">{label}</span>
                      <span className="num font-medium">{v}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Bitcoin Dominance"
            value={`${globalStats.btcDominance}%`}
            change={0.42}
            hint="ETH 12.8%"
            icon={<PieChart className="size-4" />}
            accent="btc"
          />
          <StatCard
            label="Open Interest"
            value={fmtCompact(globalStats.openInterest)}
            change={globalStats.openInterestChange}
            hint="Perpetuals"
            icon={<Activity className="size-4" />}
            accent="primary"
          />
          <StatCard
            label="Market Volume 24h"
            value={fmtCompact(globalStats.volume24h)}
            change={globalStats.volumeChange}
            hint="All venues"
            icon={<BarChart3 className="size-4" />}
            accent="down"
          />
          <StatCard
            label="Market Index"
            value={globalStats.marketIndex.toFixed(1)}
            change={globalStats.marketIndexChange}
            hint="CLX-100"
            icon={<TrendingUp className="size-4" />}
            accent="primary"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Market Heatmap"
            description="24h performance by market cap"
            action={
              <Link to="/heatmap" className="text-xs text-primary hover:underline">
                Open heatmap
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {heat.map((a) => {
                const up = a.change24h >= 0;
                const intensity = Math.min(Math.abs(a.change24h) / 8, 1) * 0.32 + 0.1;
                return (
                  <Link
                    key={a.id}
                    to="/chart"
                    search={{ symbol: a.symbol }}
                    className="group rounded-xl border border-border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                    style={{
                      background: `color-mix(in oklab, var(--${up ? "up" : "down"}) ${intensity * 100}%, transparent)`,
                    }}
                  >
                    <p className="truncate text-xs font-semibold tracking-wide">{a.symbol}</p>
                    <p
                      className={cn(
                        "num mt-1.5 text-base font-semibold tracking-tight",
                        up ? "text-up" : "text-down",
                      )}
                    >
                      {fmtPct(a.change24h)}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {fmtCompact(a.marketCap)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="Trending Assets" description="Biggest 24h movers" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {trending.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/chart"
                    search={{ symbol: a.symbol }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40 sm:px-5"
                  >
                    <AssetRowCell asset={a} />
                    <div className="flex items-center gap-4">
                      <Sparkline
                        data={a.spark}
                        positive={a.change24h >= 0}
                        dot
                        className="hidden h-7 w-20 sm:block"
                        fill={false}
                      />
                      <div className="w-24 text-right">
                        <p className="num text-sm font-medium">{fmtPrice(a.price)}</p>
                        <ChangeBadge value={a.change24h} className="mt-1" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Market Cycle"
            description="Where we are in the cycle"
            action={
              <Link to="/cycle" className="text-xs text-primary hover:underline">
                Details
              </Link>
            }
          >
            <div className="space-y-3">
              {marketCyclePhases.map((p) => (
                <div key={p.phase}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate font-medium">{p.phase}</span>
                    <span className="text-muted-foreground">{p.note}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        p.progress === 100 ? "bg-muted-foreground/50" : "bg-primary",
                      )}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Market Leaders"
            description="Top assets by capitalization"
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-border">
              {assets.slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-5"
                >
                  <AssetRowCell asset={a} />
                  <div className="flex items-center gap-4">
                    <Sparkline
                      data={a.spark}
                      positive={a.change24h >= 0}
                      dot
                      className="hidden h-7 w-20 sm:block"
                      fill={false}
                    />
                    <div className="text-right">
                      <p className="num text-sm font-medium">{fmtPrice(a.price)}</p>
                      <TrendBadge trend={a.trend} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Quick access" description="Jump into research">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/chart", label: "Advanced Chart", icon: BarChart3 },
              { to: "/screener", label: "Screener", icon: Coins },
              { to: "/ai-analysis", label: "AI Analysis", icon: Activity },
              { to: "/fear-greed", label: "Fear & Greed", icon: Gauge },
            ].map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:border-primary/40"
              >
                <q.icon className="size-4 text-primary" />
                {q.label}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
