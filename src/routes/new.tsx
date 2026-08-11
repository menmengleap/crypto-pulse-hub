import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import { BarChart3, Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { type MarketingTab } from "@/components/layout/marketing-nav";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { TerminalLink } from "@/components/layout/terminal-link";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import {
  VideoShowcase,
  LiveMarketsStrip,
  FinnhubRealtimeSection,
} from "@/components/market/new-content";
import { fmtCompact, fmtPrice, type Asset } from "@/lib/market-data";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";
import { useLiveTickers, type GlobalTicker } from "@/lib/global-market";

const tabSchema = z.enum(["new", "pricing", "market"]);

export const Route = createFileRoute("/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: tabSchema.catch("new").parse(search?.["tab"]),
  }),
  head: () => ({
    meta: [
      { title: "New, Pricing & Market — Cryptolytic" },
      {
        name: "description",
        content: "What's new, pricing plans, and live markets across crypto, stocks and forex.",
      },
      { property: "og:title", content: "New, Pricing & Market — Cryptolytic" },
    ],
  }),
  component: NewPricingMarketPage,
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const tabItems: { key: MarketingTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "pricing", label: "Pricing" },
  { key: "market", label: "Market" },
];

function TabBar({ current }: { current: MarketingTab }) {
  return (
    <div className="mb-10 flex items-center justify-center">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
        {tabItems.map((t) => (
          <Link
            key={t.key}
            to="/new"
            search={{ tab: t.key }}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              current === t.key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewPricingMarketPage() {
  const { tab } = Route.useSearch();
  return (
    <MarketingLayout>
      <TabBar current={tab} />
      {tab === "new" && <NewTabContent />}
      {tab === "pricing" && <PricingTabContent />}
      {tab === "market" && <MarketTabContent />}
    </MarketingLayout>
  );
}

// ---------------------------------------------------------------------------
// New — shared content (video showcase, live markets & Finnhub research).
// The same components render inside the console's /whats-new page.
// ---------------------------------------------------------------------------

function NewTabContent() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const top = assets.slice(0, 6);
  const movers = [...assets].sort((a, b) => b.change24h - a.change24h).slice(0, 6);
  return (
    <div className="space-y-12">
      {/* Video showcase */}
      <VideoShowcase />

      {/* Realtime information */}
      <LiveMarketsStrip top={top} stats={globalStats} movers={movers} />

      {/* New Realtime — Finnhub research (server-side, cached) */}
      <FinnhubRealtimeSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing — cards + comparison table
// ---------------------------------------------------------------------------

type Plan = {
  name: string;
  monthly: number;
  blurb: string;
  features: string[];
  cta: string;
  /** Where the plan CTA leads. Paid checkout isn't live yet — those go to Coming soon. */
  ctaTo: "/register" | "/coming-soon";
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    blurb: "For getting a feel of the terminal.",
    features: [
      "10 watchlist slots",
      "15-minute delayed data",
      "5 active alerts",
      "Fear & Greed + sentiment",
      "Community support",
    ],
    cta: "Start free",
    ctaTo: "/register",
  },
  {
    name: "Starter",
    monthly: 9,
    blurb: "For active analysts who trade the flow.",
    features: [
      "Everything in Free",
      "Real-time prices (Binance)",
      "50 watchlist slots",
      "50 active alerts",
      "AI market analysis",
      "Priority email support",
    ],
    cta: "Start 14-day trial",
    ctaTo: "/coming-soon",
    featured: true,
  },
  {
    name: "Advance",
    monthly: 29,
    blurb: "For desks and power users who need it all.",
    features: [
      "Everything in Starter",
      "Unlimited watchlists & alerts",
      "Unlimited AI analysis",
      "Global markets — stocks & forex",
      "API access",
      "1:1 onboarding",
    ],
    cta: "Go Advance",
    ctaTo: "/coming-soon",
  },
];

const compareRows = [
  { label: "Watchlist slots", free: "10", starter: "50", advance: "Unlimited" },
  { label: "Data delay", free: "15 min", starter: "Real-time", advance: "Real-time" },
  { label: "Active alerts", free: "5", starter: "50", advance: "Unlimited" },
  { label: "AI market analysis", free: "—", starter: "10 / month", advance: "Unlimited" },
  { label: "Stocks & forex markets", free: "—", starter: "—", advance: "Included" },
  { label: "API access", free: "—", starter: "—", advance: "Included" },
  { label: "Support", free: "Community", starter: "Priority email", advance: "1:1 onboarding" },
];

function PricingTabContent() {
  const [yearly, setYearly] = useState(true);
  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Zap className="size-3.5 text-primary" />
          Pricing
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          One terminal. Three honest plans.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Read-only analytics on every plan — we analyze, we never trade for you.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            "text-sm",
            !yearly ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly((y) => !y)}
          className={cn(
            "relative h-6 w-11 rounded-full border transition-colors",
            yearly ? "border-primary/40 bg-primary/25" : "border-border bg-surface",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4.5 rounded-full bg-primary transition-transform",
              yearly ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm",
            yearly ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          Yearly
          <span className="ml-1.5 rounded-md bg-up/10 px-1.5 py-0.5 text-[10px] font-semibold text-up">
            −20%
          </span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const price = yearly ? Math.round(p.monthly * 0.8 * 100) / 100 : p.monthly;
          return (
            <article
              key={p.name}
              className={cn(
                "panel relative flex flex-col p-6 transition-all duration-300 hover:-translate-y-1",
                p.featured
                  ? "border-primary/45 shadow-[0_24px_60px_-30px_var(--primary)]"
                  : "hover:border-primary/30",
              )}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  <Sparkles className="size-3" />
                  Most popular
                </span>
              )}
              <h2 className="text-base font-semibold tracking-tight">{p.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{p.blurb}</p>
              <p className="num mt-5 text-4xl font-semibold tracking-tight">
                ${price}
                <span className="text-sm font-normal text-muted-foreground"> /mo</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {yearly && p.monthly > 0
                  ? `Billed yearly · $${(price * 12).toFixed(0)}/yr`
                  : p.monthly === 0
                    ? "Free forever"
                    : "Billed monthly"}
              </p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Check className="size-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.ctaTo}
                className={cn(
                  "mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity",
                  p.featured
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border text-foreground hover:border-primary/40",
                )}
              >
                {p.cta}
                {p.featured && <Zap className="size-3.5" />}
              </Link>
            </article>
          );
        })}
      </div>

      {/* Comparison table */}
      <section>
        <h2 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
          Compare plans
        </h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feature
                </th>
                {plans.map((p) => (
                  <th key={p.name} className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {p.featured && (
                      <span className="ml-1.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Popular
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{r.label}</td>
                  <td className="px-4 py-3 text-center">{r.free}</td>
                  <td className="px-4 py-3 text-center font-medium text-primary">{r.starter}</td>
                  <td className="px-4 py-3 text-center">{r.advance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market — crypto, stocks & forex box mosaic
// ---------------------------------------------------------------------------

type Tile = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: number;
  marketCap?: number;
  spark: number[];
};

function toTile(t: Asset | GlobalTicker): Tile {
  return {
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    price: t.price,
    change: "change24h" in t ? t.change24h : t.change,
    volume: "volume24h" in t ? t.volume24h : t.volume,
    spark: t.spark,
    ...(t.marketCap !== undefined ? { marketCap: t.marketCap } : {}),
  };
}

function MarketTile({ t, large, logo }: { t: Tile; large?: boolean; logo?: ReactNode }) {
  const up = t.change >= 0;
  return (
    <div
      className={cn(
        "panel flex min-w-0 flex-col gap-3 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40",
        large && "col-span-2 row-span-2 p-5",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {logo ?? (
          <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-border bg-surface text-[9px] font-bold text-muted-foreground">
            {t.symbol.slice(0, 3)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{t.symbol}</p>
          <p className="truncate text-[10px] text-muted-foreground">{t.name}</p>
        </div>
      </div>
      <div className="mt-auto">
        <p className={cn("num font-semibold tracking-tight", large ? "text-2xl" : "text-base")}>
          {fmtPrice(t.price)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <ChangeBadge value={t.change} />
          <span className="text-[10px] text-muted-foreground">Vol {fmtCompact(t.volume)}</span>
        </div>
        {t.marketCap !== undefined && (
          <p className="mt-1 text-[10px] text-muted-foreground">Cap {fmtCompact(t.marketCap)}</p>
        )}
        <Sparkline
          data={t.spark}
          positive={up}
          className={cn("mt-3", large ? "h-12" : "h-7")}
          fill={false}
        />
      </div>
    </div>
  );
}

function Mosaic({ tiles, assets }: { tiles: Tile[]; assets?: Asset[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {tiles.map((t, i) => {
        const asset = assets?.find((a) => a.id === t.id);
        return (
          <MarketTile
            key={t.id}
            t={t}
            large={i < 3}
            logo={asset ? <AssetLogo asset={asset} className="size-7 rounded-lg" /> : undefined}
          />
        );
      })}
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MarketTabContent() {
  const assets = useLiveAssets();
  const stocks = useLiveTickers("stocks", true);
  const forex = useLiveTickers("forex", true);
  const crypto = assets.slice(0, 12);

  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <BarChart3 className="size-3.5 text-primary" />
          Global markets
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Crypto, stocks & forex — live.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Exact prices, market volume and capitalization across every market, updating in real time.
        </p>
      </div>

      <section className="space-y-4">
        <SectionTitle title="Crypto" note="Live spot prices · Binance" />
        <Mosaic tiles={crypto.map(toTile)} assets={assets} />
      </section>

      <section className="space-y-4">
        <SectionTitle title="Stocks" note="US equities · Yahoo Finance ⇄ Finnhub" />
        <Mosaic tiles={stocks.map(toTile)} />
      </section>

      <section className="space-y-4">
        <SectionTitle title="Forex" note="FX & metals · exchangerate-api ⇄ Frankfurter" />
        <Mosaic tiles={forex.map(toTile)} />
      </section>

      <p className="text-xs text-muted-foreground">
        Crypto prices stream live from Binance. Stocks & forex update from live providers with
        automatic failover (Yahoo Finance ⇄ Finnhub, exchangerate-api ⇄ Frankfurter).{" "}
        <TerminalLink to="/market" className="text-primary hover:underline">
          Open the terminal's market page
        </TerminalLink>{" "}
        for the full analyst dashboard.
      </p>
    </div>
  );
}
