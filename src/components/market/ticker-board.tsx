import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChangeBadge, MarketCard, Panel } from "@/components/market/ui";
import { LiveBadge } from "@/components/market/live-badge";
import { Sparkline } from "@/components/market/sparkline";
import { fmtCompact, fmtPrice } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";
import { useSimulatedTickers, type GlobalTicker } from "@/lib/global-market";

type Tab = "crypto" | "stocks" | "forex";

const tabs: { key: Tab; label: string }[] = [
  { key: "crypto", label: "Crypto" },
  { key: "stocks", label: "Stocks" },
  { key: "forex", label: "Forex" },
];

const descriptions: Record<Tab, string> = {
  crypto: "Live spot prices · Binance",
  stocks: "US equities · simulated feed",
  forex: "FX & metals · simulated feed",
};

function TickerRow({ t }: { t: GlobalTicker }) {
  const up = t.change >= 0;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface text-[10px] font-bold text-muted-foreground">
          {t.symbol.slice(0, 3)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{t.symbol}</p>
          <p className="truncate text-[11px] text-muted-foreground">{t.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-6">
        <Sparkline data={t.spark} positive={up} className="hidden h-7 w-24 md:block" fill={false} />
        <div className="hidden w-20 text-right sm:block">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vol</p>
          <p className="num text-[11px] font-medium">{fmtCompact(t.volume)}</p>
        </div>
        {t.marketCap !== undefined && (
          <div className="hidden w-20 text-right lg:block">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mkt cap</p>
            <p className="num text-[11px] font-medium">{fmtCompact(t.marketCap)}</p>
          </div>
        )}
        <div className="w-24 text-right">
          <p className="num truncate text-sm font-semibold">{fmtPrice(t.price)}</p>
          <ChangeBadge value={t.change} className="mt-1" />
        </div>
      </div>
    </li>
  );
}

export function TickerBoard() {
  const [tab, setTab] = useState<Tab>("crypto");
  const assets = useLiveAssets();
  const stocks = useSimulatedTickers("stocks", tab === "stocks");
  const forex = useSimulatedTickers("forex", tab === "forex");
  const top = assets.slice(0, 6);

  return (
    <Panel title="Global Markets" description={descriptions[tab]} action={<LiveBadge />}>
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-surface p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "crypto" && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="grid w-max grid-flow-col gap-3 sm:w-auto sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {top.map((a) => (
              <MarketCard key={a.id} asset={a} />
            ))}
          </div>
        </div>
      )}

      {(tab === "stocks" || tab === "forex") && (
        <div className="hidden grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 sm:grid">
          <span>Instrument</span>
          <div className="flex items-center gap-5 sm:gap-6">
            <span className="hidden w-24 md:block" />
            <span className="hidden w-20 sm:block">24h vol</span>
            <span className="hidden w-20 lg:block">Market cap</span>
            <span className="w-24 text-right">Price</span>
          </div>
        </div>
      )}

      {tab === "stocks" && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {stocks.map((t) => (
            <TickerRow key={t.id} t={t} />
          ))}
        </ul>
      )}

      {tab === "forex" && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {forex.map((t) => (
            <TickerRow key={t.id} t={t} />
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Crypto prices stream live from Binance. Stocks & forex run on a simulated feed while the
        bundled data source is offline —{" "}
        <Link to="/chart" className="text-primary hover:underline">
          open a chart
        </Link>{" "}
        for any asset.
      </p>
    </Panel>
  );
}
