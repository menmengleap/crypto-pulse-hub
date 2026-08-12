import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ChangeBadge, Panel } from "@/components/market/ui";
import { LiveBadge } from "@/components/market/live-badge";
import { Sparkline } from "@/components/market/sparkline";
import { AssetLogo } from "@/components/market/asset-logo";
import { fmtCompact, fmtPrice, type Asset } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";
import { useLiveTickers, type GlobalTicker } from "@/lib/global-market";

type Tab = "crypto" | "stocks" | "forex";

const tabs: { key: Tab; label: string }[] = [
  { key: "crypto", label: "Crypto" },
  { key: "stocks", label: "Stocks" },
  { key: "forex", label: "Forex" },
];

const descriptions: Record<Tab, string> = {
  crypto: "Live spot prices · Binance",
  stocks: "US equities · Yahoo Finance ⇄ Finnhub",
  forex: "FX & metals · exchangerate-api ⇄ Frankfurter",
};

/** Unified row shape — crypto rows carry the full Asset (real logo). */
type Row = {
  id: string;
  symbol: string;
  name: string;
  asset?: Asset;
  price: number;
  change: number;
  volume: number;
  marketCap: number | undefined;
  spark: number[];
};

function AssetCell({ row }: { row: Row }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {row.asset ? (
        <AssetLogo asset={row.asset} className="size-7 rounded-md" />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface text-[10px] font-bold text-muted-foreground">
          {row.symbol.slice(0, 3)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-foreground">{row.symbol}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{row.name}</p>
      </div>
    </div>
  );
}

function TickerRows({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-separate border-spacing-0">
        <caption className="sr-only">Live global market prices</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
            <th className="border-b border-border py-2 pl-4 text-left font-semibold sm:pl-5">
              Asset
            </th>
            <th className="border-b border-border py-2 pr-2 text-right font-semibold">Price</th>
            <th className="border-b border-border py-2 px-2 text-right font-semibold">24h %</th>
            <th className="hidden border-b border-border py-2 px-2 text-right font-semibold md:table-cell">
              24h Vol
            </th>
            <th className="hidden border-b border-border py-2 px-2 text-right font-semibold lg:table-cell">
              Mkt Cap
            </th>
            <th className="border-b border-border py-2 pl-2 pr-4 text-right font-semibold sm:pr-5">
              Last 7d
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-0">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border-b border-border/60 py-2.5 pl-4 pr-2 sm:pl-5">
                <AssetCell row={row} />
              </td>
              <td className="border-b border-border/60 py-2.5 pr-2 text-right">
                <p className="num text-sm font-semibold tracking-tight">{fmtPrice(row.price)}</p>
              </td>
              <td className="border-b border-border/60 py-2.5 px-2 text-right">
                <ChangeBadge value={row.change} />
              </td>
              <td className="hidden border-b border-border/60 py-2.5 px-2 text-right md:table-cell">
                <p className="num text-xs text-muted-foreground">{fmtCompact(row.volume)}</p>
              </td>
              <td className="hidden border-b border-border/60 py-2.5 px-2 text-right lg:table-cell">
                <p className="num text-xs text-muted-foreground">
                  {row.marketCap !== undefined ? fmtCompact(row.marketCap) : "—"}
                </p>
              </td>
              <td className="border-b border-border/60 py-2.5 pl-2 pr-4 text-right sm:pr-5">
                <Sparkline
                  data={row.spark}
                  positive={row.change >= 0}
                  dot
                  className="ml-auto h-7 w-20"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TickerBoard() {
  const [tab, setTab] = useState<Tab>("crypto");
  const assets = useLiveAssets();
  const stocks = useLiveTickers("stocks", tab === "stocks");
  const forex = useLiveTickers("forex", tab === "forex");

  const cryptoRows: Row[] = assets.slice(0, 8).map((a) => ({
    id: a.id,
    symbol: a.symbol,
    name: a.name,
    asset: a,
    price: a.price,
    change: a.change24h,
    volume: a.volume24h,
    marketCap: a.marketCap,
    spark: a.spark,
  }));

  const toRows = (list: GlobalTicker[]): Row[] =>
    list.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      price: t.price,
      change: t.change,
      volume: t.volume,
      marketCap: t.marketCap,
      spark: t.spark,
    }));

  const rows = tab === "crypto" ? cryptoRows : tab === "stocks" ? toRows(stocks) : toRows(forex);

  return (
    <Panel
      title="Global Markets"
      description={descriptions[tab]}
      action={<LiveBadge />}
      bodyClassName="p-0"
    >
      {" "}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-1 pt-4 sm:px-5">
        <div
          role="tablist"
          aria-label="Market asset class"
          className="flex items-center gap-1 rounded-full border border-border bg-surface p-1"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pb-1">
        <TickerRows rows={rows} />
      </div>
      <p className="px-4 pb-4 pt-3 text-[11px] text-muted-foreground sm:px-5">
        All prices stream live from the Cryptolytic API — Binance (crypto), Yahoo Finance ⇄ Finnhub
        (stocks) and exchangerate-api ⇄ Frankfurter (forex), with automatic provider failover.{" "}
        <Link to="/ai-analysis" className="text-primary hover:underline">
          Ask the AI chat
        </Link>{" "}
        about any asset.
      </p>
    </Panel>
  );
}
