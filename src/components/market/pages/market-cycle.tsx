import { Panel, StatCard } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { marketCapHistory, marketCyclePhases } from "@/lib/market-data";
import { cn } from "@/lib/utils";

/** Market Cycle content — shared by the console page (/cycle) and the public homepage page (/markets/cycle). */
export function MarketCycleContent() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current phase"
          value="Expansion"
          hint="72% through phase"
          accent="primary"
        />
        <StatCard label="Cycle progress" value="61%" hint="From cycle low" accent="btc" />
        <StatCard label="Days since low" value="642" hint="Prior cycles: 700–900" accent="muted" />
        <StatCard label="Drawdown from ATH" value="-4.2%" hint="Near highs" accent="down" />
      </div>

      <Panel title="Cycle phases">
        <div className="space-y-4">
          {marketCyclePhases.map((p) => (
            <div key={p.phase}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                <span className="truncate font-medium">{p.phase}</span>
                <span className="text-xs text-muted-foreground">{p.note}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
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

      <Panel title="Total market cap" description="Cycle trajectory">
        <Sparkline
          data={marketCapHistory.map((d) => d.value)}
          positive
          className="h-56"
          strokeWidth={2}
        />
      </Panel>

      <Panel title="Interpretation">
        <p className="text-sm text-muted-foreground">
          Structure remains expansionary: higher highs on the weekly, dominance grinding upward and
          breadth still narrow. Euphoria conditions — parabolic altcoin breadth, funding above 0.05%
          and dominance rolling over — have not appeared yet.
        </p>
      </Panel>
    </div>
  );
}
