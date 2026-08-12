import { Panel, StatCard } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { dominanceHistory } from "@/lib/market-data";
import { useLiveGlobal } from "@/lib/realtime";

/** Bitcoin Dominance content — shared by the console page (/dominance) and the public homepage page (/markets/dominance). */
export function BitcoinDominanceContent() {
  const globalStats = useLiveGlobal();
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="BTC dominance"
          value={`${globalStats.btcDominance}%`}
          change={0.42}
          accent="btc"
        />
        <StatCard
          label="ETH dominance"
          value={`${globalStats.ethDominance}%`}
          change={-0.18}
          accent="primary"
        />
        <StatCard
          label="Other assets"
          value={`${globalStats.otherDominance}%`}
          change={-0.24}
          accent="muted"
        />
      </div>

      <Panel title="Dominance history" description="Last 8 months">
        <Sparkline
          data={dominanceHistory.map((d) => d.btc)}
          positive
          className="h-52"
          strokeWidth={2}
        />
        <div className="mt-3 grid grid-cols-8 gap-1 text-center text-[11px] text-muted-foreground">
          {dominanceHistory.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
      </Panel>

      <Panel title="Comparison" bodyClassName="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Month</th>
              <th className="px-4 py-2.5 text-right font-medium">BTC</th>
              <th className="px-4 py-2.5 text-right font-medium">ETH</th>
              <th className="px-4 py-2.5 text-right font-medium">Other</th>
            </tr>
          </thead>
          <tbody>
            {dominanceHistory.map((d) => (
              <tr key={d.label} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{d.label}</td>
                <td className="num px-4 py-3 text-right">{d.btc.toFixed(1)}%</td>
                <td className="num px-4 py-3 text-right">{d.eth.toFixed(1)}%</td>
                <td className="num px-4 py-3 text-right">{(100 - d.btc - d.eth).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Interpretation">
        <p className="text-sm text-muted-foreground">
          Rising Bitcoin dominance alongside a rising total market cap indicates capital is entering
          the market through Bitcoin first. Broad altcoin rotation typically begins only once
          dominance stalls and rolls over.
        </p>
      </Panel>
    </div>
  );
}
