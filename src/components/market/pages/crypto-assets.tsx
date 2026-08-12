import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Panel, ChangeBadge, AssetRowCell, TrendBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { fmtCompact, fmtPrice } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const sectors = [
  "All",
  "Bitcoin",
  "Ethereum",
  "Layer 1",
  "Layer 2",
  "DeFi",
  "AI",
  "Meme",
  "Gaming",
  "Stablecoin",
];

/** Crypto Assets content — shared by the console page (/assets) and the public homepage page (/markets/assets). */
export function CryptoAssetsContent() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const assets = useLiveAssets();

  const rows = assets.filter(
    (a) =>
      (sector === "All" || a.sector === sector) &&
      `${a.symbol} ${a.name}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                sector === s
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-9 w-40 pl-8 text-xs sm:w-56"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((a) => (
          <Link
            key={a.id}
            to="/chart"
            className="panel p-4 transition-colors hover:border-primary/35"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <AssetRowCell asset={a} />
              <ChangeBadge value={a.change24h} />
            </div>
            <p className="num mt-3 text-lg font-semibold tracking-tight">{fmtPrice(a.price)}</p>
            <Sparkline data={a.spark} positive={a.change24h >= 0} className="mt-2 h-10" />
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div>
                <dt>Market cap</dt>
                <dd className="num text-foreground">{fmtCompact(a.marketCap)}</dd>
              </div>
              <div>
                <dt>Volume 24h</dt>
                <dd className="num text-foreground">{fmtCompact(a.volume24h)}</dd>
              </div>
              <div>
                <dt>RSI</dt>
                <dd className="num text-foreground">{a.rsi.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Sector</dt>
                <dd className="text-foreground">{a.sector}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <TrendBadge trend={a.trend} />
            </div>
          </Link>
        ))}
      </div>

      {rows.length === 0 && (
        <Panel>
          <p className="py-10 text-center text-sm text-muted-foreground">
            No assets match your filters.
          </p>
        </Panel>
      )}
    </div>
  );
}
