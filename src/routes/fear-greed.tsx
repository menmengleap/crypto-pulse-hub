import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { Panel, SentimentGauge, StatCard } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { fearGreedHistory7, fearGreedHistory30 } from "@/lib/market-data";
import { useLiveGlobal } from "@/lib/realtime";

export const Route = createFileRoute("/fear-greed")({
  head: () => ({
    meta: [
      { title: "Fear & Greed Index — Cryptolytic" },
      { name: "description", content: "Crypto Fear & Greed index with current score, 7-day and 30-day history and market interpretation." },
      { property: "og:title", content: "Fear & Greed Index — Cryptolytic" },
      { property: "og:description", content: "Track crypto market emotion from extreme fear to extreme greed." },
    ],
  }),
  component: FearGreedPage,
});

function FearGreedPage() {
  const globalStats = useLiveGlobal();
  return (
    <AppShell title="Fear & Greed" subtitle="Market emotion index">
      <div className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Current reading" description="Updated hourly">
            <SentimentGauge score={globalStats.fearGreed} label={globalStats.fearGreedLabel} />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Yesterday {globalStats.fearGreedPrev} · Last week 55 · Last month 44
            </p>
          </Panel>
          <Panel title="7-day history" className="lg:col-span-2">
            <Sparkline data={fearGreedHistory7} positive className="h-40" strokeWidth={2} />
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {fearGreedHistory7.map((v, i) => (
                <span key={i} className="num">{v}</span>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Volatility" value="Moderate" hint="30d realized 42%" accent="btc" />
          <StatCard label="Momentum / Volume" value="Elevated" hint="Above 30d average" accent="primary" />
          <StatCard label="Social sentiment" value="Positive" hint="64 / 100" accent="primary" />
          <StatCard label="Dominance shift" value="+0.42%" hint="BTC gaining share" accent="btc" />
        </div>

        <Panel title="30-day history" description="Index readings">
          <Sparkline data={fearGreedHistory30} positive className="h-48" strokeWidth={2} />
        </Panel>

        <Panel title="What this means">
          <p className="text-sm text-muted-foreground">
            A reading of {globalStats.fearGreed} places the market in <span className="text-foreground">greed</span>{" "}
            territory. Historically, sustained greed above 70 has coincided with local tops, while readings below 25 have
            marked accumulation zones. The index is a contrarian context tool, not a timing signal on its own.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
