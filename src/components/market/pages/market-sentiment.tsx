import { Panel, StatCard, SentimentGauge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { fearGreedHistory30 } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";

const drivers = [
  { label: "Spot flows", value: 72, note: "Net buying across major venues" },
  { label: "Derivatives funding", value: 58, note: "Mildly long, no crowding" },
  { label: "Social momentum", value: 64, note: "Mentions above 30d average" },
  { label: "On-chain accumulation", value: 81, note: "Long-term holders adding" },
  { label: "Stablecoin supply", value: 69, note: "Expanding — dry powder rising" },
  { label: "Breadth", value: 41, note: "Narrow, led by majors" },
];

/** Market Sentiment content — shared by the console page (/sentiment) and the public homepage page (/markets/sentiment). */
export function MarketSentimentContent() {
  const assets = useLiveAssets();
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Composite score">
          <SentimentGauge score={64} label="Risk-on" />
        </Panel>
        <Panel title="Sentiment drivers" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {drivers.map((d) => (
              <div key={d.label}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{d.label}</span>
                  <span className="num font-medium">{d.value}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${d.value}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{d.note}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Long / Short" value="1.08" change={1.1} accent="primary" />
        <StatCard label="Funding avg" value="+0.0094%" change={0.4} accent="btc" />
        <StatCard label="Altseason index" value="34 / 100" change={-2.4} accent="down" />
        <StatCard label="Retail interest" value="Rising" change={6.2} accent="primary" />
      </div>

      <Panel title="Sentiment trend" description="30 days">
        <Sparkline data={fearGreedHistory30} positive className="h-48" strokeWidth={2} />
      </Panel>

      <Panel title="Leaders by sentiment" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {[...assets]
            .sort((a, b) => b.rsi - a.rsi)
            .slice(0, 6)
            .map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="truncate font-medium">
                  {a.symbol} · {a.name}
                </span>
                <span className="num text-muted-foreground">RSI {a.rsi.toFixed(1)}</span>
              </li>
            ))}
        </ul>
      </Panel>
    </div>
  );
}
