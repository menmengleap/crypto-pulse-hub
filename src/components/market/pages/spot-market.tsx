import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Panel, ChangeBadge, AssetRowCell, TrendBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { fmtCompact, fmtPrice } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Spot Market content — shared by the console page (/spot) and the public
 * homepage page (/markets/spot). In public mode, rows are informational (no
 * links into the auth-gated console chart).
 */
export function SpotMarketContent({ variant = "console" }: { variant?: "console" | "public" }) {
  const isPublic = variant === "public";
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const assets = useLiveAssets();

  const rows = assets.filter((a) => {
    const match = `${a.symbol} ${a.name}`.toLowerCase().includes(q.toLowerCase());
    if (!match) return false;
    if (tab === "gainers") return a.change24h > 0;
    if (tab === "losers") return a.change24h < 0;
    if (tab === "volume") return a.volume24h > 1e9;
    return true;
  });

  return (
    <Panel
      title="Spot pairs"
      description={`${rows.length} markets`}
      bodyClassName="p-0"
      action={
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search pair"
              className="h-8 w-44 pl-8 text-xs"
            />
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="gainers" className="text-xs">
                Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" className="text-xs">
                Losers
              </TabsTrigger>
              <TabsTrigger value="volume" className="text-xs">
                Volume
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Pair</th>
              <th className="px-4 py-2.5 text-right font-medium">Price</th>
              <th className="px-4 py-2.5 text-right font-medium">24h</th>
              <th className="px-4 py-2.5 text-right font-medium">Volume</th>
              <th className="px-4 py-2.5 text-right font-medium">Market cap</th>
              <th className="px-4 py-2.5 text-right font-medium">Trend</th>
              <th className="px-4 py-2.5 text-right font-medium">7d</th>
            </tr>
          </thead>
          <tbody>
            {" "}
            {rows.map((a) => (
              <tr
                key={a.id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"
              >
                <td className="px-4 py-3">
                  {isPublic ? (
                    <AssetRowCell asset={a} />
                  ) : (
                    <Link to="/chart">
                      <AssetRowCell asset={a} />
                    </Link>
                  )}
                </td>
                <td className="num px-4 py-3 text-right">{fmtPrice(a.price)}</td>
                <td className="px-4 py-3 text-right">
                  <ChangeBadge value={a.change24h} />
                </td>
                <td className="num px-4 py-3 text-right text-muted-foreground">
                  {fmtCompact(a.volume24h)}
                </td>
                <td className="num px-4 py-3 text-right text-muted-foreground">
                  {fmtCompact(a.marketCap)}
                </td>
                <td className="px-4 py-3 text-right">
                  <TrendBadge trend={a.trend} />
                </td>
                <td className="px-4 py-3">
                  <Sparkline
                    data={a.spark}
                    positive={a.change7d >= 0}
                    className="ml-auto h-7 w-24"
                    fill={false}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
