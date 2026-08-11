import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bell, Brain, Gauge, LineChart, Newspaper } from "lucide-react";
import { fmtCompact, fmtDominance, fmtPrice } from "@/lib/market-data";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";
import { ChangeBadge } from "@/components/market/ui";
import { AssetLogo } from "@/components/market/asset-logo";
import { Sparkline } from "@/components/market/sparkline";
import { LoopingVideo } from "@/components/layout/looping-video";
import { MarketingNav } from "@/components/layout/marketing-nav";
import { TerminalLink } from "@/components/layout/terminal-link";
import { AudienceSection } from "@/components/layout/audience-map";
import { ProductShowcase } from "@/components/layout/product-showcase";
import { SiteFooter } from "@/components/layout/site-footer";
import { TestimonialSection } from "@/components/layout/testimonials";
import { LiveCryptoFan } from "@/components/market/live-crypto-fan";
import { MarketSummary } from "@/components/market/market-summary";
import { cn } from "@/lib/utils";
import heroVideo from "@/Video/new-op.mp4";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cryptolytic — Crypto Market Analytics & Intelligence" },
      {
        name: "description",
        content:
          "Professional crypto market analytics: live charts, technical indicators, sentiment, screener, heatmaps and AI-assisted research. Analysis only, no trading.",
      },
      { property: "og:title", content: "Cryptolytic — Crypto Market Analytics & Intelligence" },
      {
        property: "og:description",
        content:
          "Charts, indicators, sentiment and AI research for serious crypto market analysts.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: LineChart,
    title: "Advanced charting",
    text: "Candlesticks, volume and crosshair analysis with a workspace built for reading structure, not clicking buttons.",
  },
  {
    icon: Gauge,
    title: "Sentiment engine",
    text: "Fear & Greed, market cycle phase and dominance trends condensed into signals you can act on.",
  },
  {
    icon: Brain,
    title: "AI market analyst",
    text: "Structured multi-timeframe reads on trend, momentum and key levels — written like a desk note.",
  },
  {
    icon: BarChart3,
    title: "Screener",
    text: "Filter thousands of pairs by RSI, trend, breakout state, volume and market cap in one table.",
  },
  {
    icon: Newspaper,
    title: "News with context",
    text: "Every headline tagged with sentiment, related assets and expected market impact.",
  },
  {
    icon: Bell,
    title: "Alerts & saved work",
    text: "Track levels, indicators and research notes across watchlists that stay in sync.",
  },
];

function BtcSpotlightBox() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const btc = assets.find((a) => a.symbol === "BTC");
  const hasPrice = !!btc && Number.isFinite(btc.price) && btc.price > 0;
  return (
    <div className="rounded-xl border border-border bg-background/60 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        {btc ? (
          <AssetLogo asset={btc} className="size-9 rounded-xl" />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-[10px] font-bold text-muted-foreground">
            BTC
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Bitcoin</p>
          <p className="truncate text-[11px] text-muted-foreground">BTC/USDT · live</p>
        </div>
      </div>
      <p className="num mt-4 text-3xl font-semibold tracking-tight">
        {hasPrice ? fmtPrice(btc.price) : "—"}
      </p>
      <div className="mt-2">
        {hasPrice && btc ? (
          <ChangeBadge value={btc.change24h} />
        ) : (
          <span className="text-xs text-muted-foreground">Waiting for live data…</span>
        )}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Market cap</dt>
          <dd className="num mt-0.5 text-sm font-semibold">
            {btc && btc.marketCap > 0 ? fmtCompact(btc.marketCap) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">BTC dominance</dt>
          <dd className="num mt-0.5 text-sm font-semibold">
            {fmtDominance(globalStats.btcDominance)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">24h volume</dt>
          <dd className="num mt-0.5 text-sm font-semibold">
            {btc && btc.volume24h > 0 ? fmtCompact(btc.volume24h) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">7d change</dt>
          <dd
            className={cn(
              "num mt-0.5 text-sm font-semibold",
              btc && btc.change7d >= 0 ? "text-up" : "text-down",
            )}
          >
            {btc ? `${btc.change7d >= 0 ? "+" : ""}${btc.change7d.toFixed(2)}%` : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Landing() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const top = assets.slice(0, 6);
  return (
    <div className="min-h-screen">
      <MarketingNav />

      <section className="relative flex min-h-[100svh] items-center overflow-hidden border-b border-border">
        {/* Homepage video — full-screen background */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <LoopingVideo src={heroVideo} preload="auto" overlayClassName="bg-black/60" />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Read the market
                <span className="block text-muted-foreground">before it moves.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground">
                A market intelligence terminal for crypto research: technical structure, sentiment,
                dominance, news impact and AI-assisted analysis in one dense, quiet interface.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <TerminalLink
                  to="/market"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Launch market overview <ArrowRight className="size-4" />
                </TerminalLink>
                <TerminalLink
                  to="/chart"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
                >
                  Explore charts
                </TerminalLink>
              </div>

              <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
                {[
                  ["Market cap", fmtCompact(globalStats.marketCap)],
                  ["24h volume", fmtCompact(globalStats.volume24h)],
                  ["BTC dominance", fmtDominance(globalStats.btcDominance)],
                  ["Fear & Greed", `${globalStats.fearGreed} · ${globalStats.fearGreedLabel}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="num mt-1 text-lg font-semibold tracking-tight">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <BtcSpotlightBox />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {top.map((a) => (
              <div key={a.id} className="panel p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold">{a.symbol}</span>
                  <ChangeBadge value={a.change24h} />
                </div>
                <p className="num mt-2 text-sm font-semibold">
                  {a.price >= 1
                    ? `$${a.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                    : `$${a.price}`}
                </p>
                <Sparkline data={a.spark} positive={a.change24h >= 0} className="mt-2 h-7" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything an analyst needs. Nothing they don't.
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          No order tickets, no wallets, no noise. Cryptolytic is built for the part of the job that
          actually decides outcomes — understanding the market.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="panel p-5 transition-colors hover:border-primary/30">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <ProductShowcase />

      <TestimonialSection />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ten pairs. One terminal. Live.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The same realtime feed that powers the terminal — prices, momentum, and volume for the
            pairs that matter, streaming straight from the backend.
          </p>
        </div>
        <LiveCryptoFan className="mt-8" />

        <MarketSummary className="mt-12" />
      </section>

      <AudienceSection />

      <SiteFooter />
    </div>
  );
}
