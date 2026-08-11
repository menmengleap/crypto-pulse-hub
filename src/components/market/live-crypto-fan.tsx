import { useMemo } from "react";
import { useLiveAssets } from "@/lib/realtime";
import { bySymbol, fmtCompact, fmtPrice, type Asset } from "@/lib/market-data";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import { CardFanCarousel, type CardItem } from "@/components/ui/card-fan-carousel";

/**
 * Live market pairs rendered as a single drifting gsap row.
 *
 * The row reads the same realtime store as the rest of the app (useLiveAssets
 * → backend /api/live/markets). The cards array is built once per mount so the
 * gsap slide animation never re-runs on every 8s poll — each card subscribes
 * to the store independently and only its inner content re-renders when
 * prices tick.
 */
const WATCHLIST = ["BTC", "ETH", "PEPE", "BNB", "XRP", "ARB", "OP", "SOL", "DOGE", "USDT"] as const;

function LiveCryptoCard({ symbol }: { symbol: string }) {
  const assets = useLiveAssets();
  // All watchlist symbols exist in the static catalog, so bySymbol's fallback
  // (the first static asset) is always reached at runtime.
  const asset: Asset = assets.find((a) => a.symbol === symbol) ?? bySymbol(symbol)!;

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3.5">
      <div className="flex items-center gap-2">
        <AssetLogo asset={asset} className="size-8 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-tight">{asset.symbol}</p>
          <p className="truncate text-[10px] text-muted-foreground">{asset.name}</p>
        </div>
      </div>

      <p className="num mt-0.5 text-lg font-semibold tracking-tight">{fmtPrice(asset.price)}</p>
      <div>
        <ChangeBadge value={asset.change24h} />
      </div>

      <Sparkline
        data={asset.spark}
        positive={asset.change24h >= 0}
        className="mt-auto h-9 w-full"
      />

      <dl className="mt-auto grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-border/60 pt-2 text-[10px]">
        <div>
          <dt className="text-muted-foreground">Mkt cap</dt>
          <dd className="num font-semibold">{fmtCompact(asset.marketCap)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">24h vol</dt>
          <dd className="num font-semibold">{fmtCompact(asset.volume24h)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function LiveCryptoFan({ className }: { className?: string }) {
  const cards = useMemo<CardItem[]>(
    () =>
      WATCHLIST.map((symbol) => ({
        id: symbol,
        content: <LiveCryptoCard symbol={symbol} />,
      })),
    [],
  );

  return (
    <CardFanCarousel
      cards={cards}
      cardClassName="aspect-[4/7] w-36 sm:w-44"
      {...(className ? { className } : {})}
    />
  );
}
