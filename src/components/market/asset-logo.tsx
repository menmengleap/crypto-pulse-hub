import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/market-data";

/**
 * Real asset logo (CoinGecko image URL on the Asset). Falls back to the
 * branded colored-initial tile if the image can't load.
 */
export function AssetLogo({ asset, className }: { asset: Asset; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [asset.image]);

  if (failed || !asset.image) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg text-[10px] font-bold",
          className,
        )}
        style={{ background: `${asset.color}1f`, color: asset.color }}
      >
        {asset.symbol.slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={asset.image}
      alt={`${asset.name} logo`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        "shrink-0 rounded-lg bg-surface object-contain p-0.5 ring-1 ring-border",
        className,
      )}
    />
  );
}
