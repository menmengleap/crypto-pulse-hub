import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain,
  Crosshair,
  Expand,
  GitCompareArrows,
  LineChart,
  PenLine,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PriceChart } from "@/components/chart/price-chart";
import { Panel, IndicatorCard, ChangeBadge } from "@/components/market/ui";
import { assets, indicators, timeframes, fmtCompact, fmtPrice } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Advanced Chart — Cryptolytic" },
      { name: "description", content: "Advanced candlestick charting with volume, indicators, market structure and AI-assisted analysis." },
      { property: "og:title", content: "Advanced Chart — Cryptolytic" },
      { property: "og:description", content: "Candles, volume, indicators and structure in one analyst workspace." },
    ],
  }),
  component: ChartPage,
});

const tools = [
  { icon: SlidersHorizontal, label: "Indicators" },
  { icon: GitCompareArrows, label: "Compare" },
  { icon: PenLine, label: "Drawing" },
  { icon: Settings2, label: "Settings" },
  { icon: Expand, label: "Fullscreen" },
];

function ChartPage() {
  const [symbol, setSymbol] = useState("BTC");
  const [tf, setTf] = useState<string>("4H");
  const [fullscreen, setFullscreen] = useState(false);
  const asset = assets.find((a) => a.symbol === symbol) ?? assets[0]!;

  return (
    <AppShell title="Advanced Chart" subtitle={`${asset.pair} · ${tf}`}>
      <div className="space-y-5">
        <Panel bodyClassName="p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-4">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-9 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.symbol}>
                      {a.pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="min-w-0">
                <p className="num text-2xl font-semibold tracking-tight">{fmtPrice(asset.price)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ChangeBadge value={asset.change24h} />
                  <span className="text-xs text-muted-foreground">24h vol {fmtCompact(asset.volume24h)}</span>
                </div>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-up" /> Market open
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="flex flex-wrap gap-1">
              {timeframes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs transition-colors",
                    tf === t ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <div className="flex flex-wrap gap-1">
              {tools.map((tool) => (
                <button
                  key={tool.label}
                  onClick={() => tool.label === "Fullscreen" && setFullscreen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <tool.icon className="size-3.5" />
                  <span className="hidden sm:inline">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 sm:p-3">
            <PriceChart seed={symbol.length * 17 + 5} start={asset.price} height={fullscreen ? 720 : 460} />
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Technical Analysis" description={`${asset.pair} · ${tf}`} className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {indicators.map((i) => (
                <IndicatorCard key={i.name} {...i} />
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel title="Market Structure">
              <dl className="space-y-3 text-sm">
                {[
                  ["Structure", "Higher High / Higher Low"],
                  ["Trend", asset.trend],
                  ["Momentum", asset.momentum],
                  ["Volatility", "Expanding"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <dt className="truncate text-muted-foreground">{k}</dt>
                    <dd className="truncate font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Support & Resistance">
              <div className="space-y-3">
                {[
                  ["Resistance 2", "$124,800", "down"],
                  ["Resistance 1", "$120,200", "down"],
                  ["Support 1", "$116,400", "up"],
                  ["Support 2", "$112,100", "up"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border px-3 py-2">
                    <span className="truncate text-xs text-muted-foreground">{label}</span>
                    <span className={cn("num text-sm font-medium", tone === "up" ? "text-up" : "text-down")}>{value}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="AI Analysis" description="Generated from current chart">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Brain className="size-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Price holds above the 20 and 50 EMA with an intact higher-low sequence. Momentum is strong but
                  stochastic is approaching overbought — continuation favours a retest of {"$"}120,200 while {"$"}116,400
                  remains the invalidation shelf.
                </p>
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Momentum">
            <div className="space-y-3">
              {[
                ["RSI (14)", asset.rsi, 100],
                ["Stochastic", 78.4, 100],
                ["MFI", 62.1, 100],
              ].map(([label, v, max]) => (
                <div key={label as string}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{label}</span>
                    <span className="num">{(v as number).toFixed(1)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${((v as number) / (max as number)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Volume profile">
            <dl className="space-y-3 text-sm">
              {[
                ["24h volume", fmtCompact(asset.volume24h)],
                ["Volume vs 30d avg", "+18.4%"],
                ["Point of control", "$117,900"],
                ["Value area", "$114.2k – $120.6k"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <dt className="truncate text-muted-foreground">{k}</dt>
                  <dd className="num truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Session context">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-btc/12 text-btc">
                <Crosshair className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">
                Asian session drove the initial expansion, US session confirmed with above-average participation. No
                significant liquidation cluster until {"$"}112k.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LineChart className="size-3.5" /> Data is illustrative mock market data.
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
