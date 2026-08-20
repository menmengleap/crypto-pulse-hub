import { useEffect, useRef, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { AlertsPopover } from "@/components/terminal/alerts-popover";
import { Brand, AccountMenu } from "@/components/layout/app-shell";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge } from "@/components/market/ui";
import { fmtPrice, type Asset } from "@/lib/market-data";
import { useLiveAssets } from "@/lib/realtime";

/**
 * Compact terminal top nav — brand, market search, live status and the
 * session-aware controls. Stays slim so the chart owns the viewport.
 */
export function TopNav({
  symbol,
  onSelectSymbol,
  onOpenChat,
}: {
  symbol: string;
  onSelectSymbol: (s: string) => void;
  onOpenChat: () => void;
}) {
  const assets = useLiveAssets();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const query = q.trim().toLowerCase();
  const matches =
    query.length > 0
      ? assets.filter(
          (a) => a.symbol.toLowerCase().includes(query) || a.name.toLowerCase().includes(query),
        )
      : [];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (s: string) => {
    onSelectSymbol(s);
    setQ("");
    setOpen(false);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      <div className="hidden min-w-0 items-center sm:flex">
        <Brand subtitle="Advanced AI Trading" />
      </div>

      {/* Market search */}
      <div ref={boxRef} className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search market…"
          className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
        />
        {open && query.length > 0 && (
          <div className="absolute left-0 right-0 top-10 z-50 max-h-80 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg">
            {matches.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matches.</p>
            )}
            {matches.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a.symbol)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent"
              >
                <AssetLogo asset={a} className="size-5 rounded" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{a.symbol}</span>
                  <span className="ml-1.5 text-muted-foreground">{a.name}</span>
                </span>
                <span className="num text-muted-foreground">{fmtPrice(a.price)}</span>
                <ChangeBadge value={a.change24h} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenChat}
          title="Open AI research chat"
          aria-label="Open AI research chat"
          className="grid size-8 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <MessageSquare className="size-3.5" />
        </button>
        <AlertsPopover />

        <AccountMenu />
      </div>
    </header>
  );
}
