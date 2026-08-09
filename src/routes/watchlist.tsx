import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel, ChangeBadge, AssetRowCell, TrendBadge, EmptyState } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { fmtCompact, fmtPrice } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Cryptolytic" },
      { name: "description", content: "Build custom crypto watchlists with price, change, volume, RSI and trend at a glance." },
      { property: "og:title", content: "Watchlist — Cryptolytic" },
      { property: "og:description", content: "Track the assets you care about in one focused view." },
    ],
  }),
  component: WatchlistPage,
});

type List = { id: string; name: string; symbols: string[] };

const initial: List[] = [
  { id: "core", name: "Core majors", symbols: ["BTC", "ETH", "SOL", "BNB"] },
  { id: "high-beta", name: "High beta", symbols: ["DOGE", "PEPE", "AVAX"] },
  { id: "infra", name: "Infrastructure", symbols: ["ARB", "OP", "FET"] },
];

function WatchlistPage() {
  const [lists, setLists] = useState(initial);
  const [activeId, setActiveId] = useState("core");
  const [newName, setNewName] = useState("");
  const active = lists.find((l) => l.id === activeId) ?? lists[0];
  const assets = useLiveAssets();
  const rows = assets.filter((a) => active?.symbols.includes(a.symbol));

  const remove = (symbol: string) => {
    setLists((ls) => ls.map((l) => (l.id === activeId ? { ...l, symbols: l.symbols.filter((s) => s !== symbol) } : l)));
    toast.success(`${symbol} removed from ${active?.name}`);
  };

  const createList = () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, "-");
    setLists((ls) => [...ls, { id, name: newName.trim(), symbols: [] }]);
    setActiveId(id);
    setNewName("");
    toast.success("Watchlist created");
  };

  const addAsset = (symbol: string) => {
    setLists((ls) =>
      ls.map((l) => (l.id === activeId && !l.symbols.includes(symbol) ? { ...l, symbols: [...l.symbols, symbol] } : l)),
    );
  };

  return (
    <AppShell title="Watchlist" subtitle="Your tracked markets">
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Panel title="Lists" bodyClassName="p-3">
          <ul className="space-y-1">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => setActiveId(l.id)}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    l.id === activeId ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Star className={cn("size-3.5 shrink-0", l.id === activeId && "text-primary")} />
                    <span className="truncate">{l.name}</span>
                  </span>
                  <span className="num text-xs">{l.symbols.length}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New list" className="h-8 text-xs" />
            <Button size="sm" className="h-8 shrink-0" onClick={createList}>
              <Plus className="size-3.5" />
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title={active?.name ?? "Watchlist"} description={`${rows.length} assets`} bodyClassName="p-0">
            {rows.length === 0 ? (
              <div className="p-5">
                <EmptyState title="This watchlist is empty" description="Add assets below to start tracking them." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Asset</th>
                      <th className="px-4 py-2.5 text-right font-medium">Price</th>
                      <th className="px-4 py-2.5 text-right font-medium">24h</th>
                      <th className="px-4 py-2.5 text-right font-medium">Volume</th>
                      <th className="px-4 py-2.5 text-right font-medium">RSI</th>
                      <th className="px-4 py-2.5 text-right font-medium">Trend</th>
                      <th className="px-4 py-2.5 text-right font-medium">Chart</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3"><AssetRowCell asset={a} /></td>
                        <td className="num px-4 py-3 text-right">{fmtPrice(a.price)}</td>
                        <td className="px-4 py-3 text-right"><ChangeBadge value={a.change24h} /></td>
                        <td className="num px-4 py-3 text-right text-muted-foreground">{fmtCompact(a.volume24h)}</td>
                        <td className="num px-4 py-3 text-right">{a.rsi.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right"><TrendBadge trend={a.trend} /></td>
                        <td className="px-4 py-3"><Sparkline data={a.spark} positive={a.change24h >= 0} className="ml-auto h-7 w-24" fill={false} /></td>
                        <td className="px-2 py-3 text-right">
                          <button onClick={() => remove(a.symbol)} aria-label={`Remove ${a.symbol}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-down">
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Add assets" description="Click to add to the active list">
            <div className="flex flex-wrap gap-2">
              {assets
                .filter((a) => !active?.symbols.includes(a.symbol))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addAsset(a.symbol)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    + {a.symbol}
                  </button>
                ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
