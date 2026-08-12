import { useLiveAssets } from "@/lib/realtime";
import { fmtPrice } from "@/lib/market-data";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge } from "@/components/market/ui";
import { cn } from "@/lib/utils";

/**
 * Live price ticker strip for the Advanced Chat. Shows the top crypto assets
 * scrolling in a seamless marquee — prices stream from the same live store as
 * the rest of the terminal. Clicking any asset asks the chat about it.
 */
export function PriceTicker({ onPick }: { onPick: (symbol: string) => void }) {
  const assets = useLiveAssets();
  const items = assets.slice(0, 16);
  // Duplicate the list so the marquee can loop seamlessly (-50% translate).
  const doubled = [...items, ...items];

  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden border-b border-border bg-surface/50">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent sm:w-12" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:w-12" />
      <div className="ticker-track flex w-max items-center py-2">
        {/* Symmetric leading spacer so the -50% loop seam is exact. */}
        <div aria-hidden className="w-4 shrink-0 sm:w-10" />
        {doubled.map((a, i) => (
          <button
            key={`${a.id}-${i}`}
            type="button"
            onClick={() => onPick(a.symbol)}
            title={`Ask about ${a.symbol}`}
            className="group flex shrink-0 items-center gap-2 pr-7 text-left"
          >
            <AssetLogo asset={a} className="size-5 rounded-md" />
            <span className="text-xs font-semibold tracking-wide">{a.symbol}</span>
            <span className="num text-xs text-muted-foreground">{fmtPrice(a.price)}</span>
            <ChangeBadge value={a.change24h} />
          </button>
        ))}
      </div>
    </div>
  );
}
