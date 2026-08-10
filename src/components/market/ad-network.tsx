import { useEffect, useRef } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ad Network panel for the /new page.
 *
 * Branded, crypto/forex/international-stock themed ad slots for three networks:
 * A-Ads, Adsterra and PropellerAds. To go live, paste your zone ID and the
 * network's async script URL into the AD_NETWORKS config below — when both are
 * set the script is injected into the slot automatically. Until then each slot
 * renders a polished, clearly-labeled "Ad" placeholder.
 */

export type AdNetwork = {
  id: string;
  name: string;
  tagline: string;
  audience: string; // target audience headline (crypto / forex / stocks)
  accent: string; // brand accent (hex)
  accentSoft: string; // translucent accent for backgrounds
  href: string; // network site, used as the CTA until zoneId is set
  creative: string; // recommended creative size, e.g. "728×90"
  zoneId?: string; // ← paste your zone ID here to activate live ads
  scriptSrc?: string; // ← optional async ad script URL
};

/** Paste real zone IDs / script URLs here to enable live ads. */
export const AD_NETWORKS: AdNetwork[] = [
  {
    id: "a-ads",
    name: "A-Ads",
    tagline: "The crypto-native ad network",
    audience: "Bitcoin · Ethereum · Altcoin trading",
    accent: "#2ED3A0",
    accentSoft: "rgba(46, 211, 160, 0.12)",
    href: "https://a-ads.com",
    creative: "728×90 · 300×250",
  },
  {
    id: "adsterra",
    name: "Adsterra",
    tagline: "Global display & native formats",
    audience: "Forex pairs · Indices · Trading desks",
    accent: "#4F8CFF",
    accentSoft: "rgba(79, 140, 255, 0.12)",
    href: "https://adsterra.com",
    creative: "300×250 · 728×90",
  },
  {
    id: "propellerads",
    name: "PropellerAds",
    tagline: "Push, pop & interstitial formats",
    audience: "Stock markets · Global equities",
    accent: "#A78BFA",
    accentSoft: "rgba(167, 139, 250, 0.14)",
    href: "https://propellerads.com",
    creative: "160×600 · 300×600",
  },
];
function AdSlot({ network }: { network: AdNetwork }) {
  const initials = network.name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();
  const creativeRef = useRef<HTMLDivElement | null>(null);

  // Inject the network's async script when a zone ID + script URL are set.
  useEffect(() => {
    const host = creativeRef.current;
    if (!network.zoneId || !network.scriptSrc || !host) return;
    const el = document.createElement("script");
    el.src = network.scriptSrc;
    el.async = true;
    el.dataset["zone"] = network.zoneId;
    host.appendChild(el);
    return () => {
      el.remove();
    };
  }, [network.zoneId, network.scriptSrc]);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:border-primary/40">
      {/* Corner "Ad" label */}
      <span className="absolute right-2.5 top-2.5 z-10 rounded bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border backdrop-blur">
        Ad
      </span>

      {/* Brand header */}
      <div className="flex items-center gap-2.5 px-4 pb-1 pt-3.5 pr-12">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold"
          style={{ background: network.accentSoft, color: network.accent }}
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{network.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{network.tagline}</p>
        </div>
      </div>

      {/* Creative */}
      <div ref={creativeRef} className="px-4 pb-3.5 pt-2">
        <p className="text-xs font-medium" style={{ color: network.accent }}>
          {network.audience}
        </p>
        {network.zoneId ? (
          <div className="mt-2.5 rounded-lg border border-up/25 bg-up/5 px-3 py-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-up">
              Live ad configured · zone {network.zoneId}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {network.scriptSrc
                ? `${network.name} script is loading…`
                : `${network.name} creative renders here.`}
            </p>
          </div>
        ) : (
          <div className="mt-2.5 rounded-lg border border-dashed border-border bg-background/60 px-3 py-2.5 text-center transition-colors group-hover:border-muted-foreground/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {network.creative}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Your {network.name} ad appears here
            </p>
          </div>
        )}
      </div>

      {/* Accent bar + CTA */}
      <div className="h-0.5 w-full" style={{ background: network.accentSoft }} />
      <a
        href={network.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        style={{ background: network.accentSoft }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Megaphone className="size-3.5" style={{ color: network.accent }} />
          {network.zoneId ? `Advertise on ${network.name}` : `Get started on ${network.name}`}
        </span>
        <ExternalLink className="size-3.5" style={{ color: network.accent }} />
      </a>
    </div>
  );
}

export function AdNetworkPanel({ className }: { className?: string }) {
  return (
    <aside className={cn("panel overflow-hidden lg:sticky lg:top-24", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
            <Megaphone className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">Ad Network</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              A-Ads · Adsterra · PropellerAds
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Sponsored
        </span>
      </header>
      <div className="space-y-3 p-3.5">
        {AD_NETWORKS.map((n) => (
          <AdSlot key={n.id} network={n} />
        ))}
      </div>
    </aside>
  );
}
