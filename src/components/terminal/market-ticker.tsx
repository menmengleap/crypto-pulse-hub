import { useLiveAssets } from "@/lib/realtime";
import { fmtPrice } from "@/lib/market-data";
import { AssetLogo } from "@/components/market/asset-logo";
import { cn } from "@/lib/utils";

/**
 * Horizontal market ticker below the top nav. Scrollable, compact, and each
 * quote is clickable to switch the chart to that asset. The active symbol is
 * highlighted with the AI accent.
 */
export function MarketTicker({
  symbol,
  onSelect,
}: {
  symbol: string;
  onSelect: (s: string) => void;
}) {
  const assets = useLiveAssets();
  return (
    <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-border bg-surface/60 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {assets.map((a) => {
        const up = a.change24h >= 0;
        const active = a.symbol === symbol;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.symbol)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1 text-xs transition-colors",
              active
                ? "bg-primary/12 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <AssetLogo asset={a} className="size-4 rounded" />
            <span className={cn("font-semibold", active && "text-primary")}>{a.symbol}</span>
            <span className="num text-muted-foreground">{fmtPrice(a.price)}</span>
            <span className={cn("num text-[11px] font-medium", up ? "text-up" : "text-down")}>
              {up ? "+" : ""}
              {a.change24h.toFixed(2)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
