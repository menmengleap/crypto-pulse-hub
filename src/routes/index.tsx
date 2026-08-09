import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bell, Brain, Flame, Gauge, LineChart, Newspaper, ShieldCheck } from "lucide-react";
import { assets, fmtCompact, globalStats } from "@/lib/market-data";
import { ChangeBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";

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
        content: "Charts, indicators, sentiment and AI research for serious crypto market analysts.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: LineChart, title: "Advanced charting", text: "Candlesticks, volume and crosshair analysis with a workspace built for reading structure, not clicking buttons." },
  { icon: Gauge, title: "Sentiment engine", text: "Fear & Greed, market cycle phase and dominance trends condensed into signals you can act on." },
  { icon: Brain, title: "AI market analyst", text: "Structured multi-timeframe reads on trend, momentum and key levels — written like a desk note." },
  { icon: BarChart3, title: "Screener", text: "Filter thousands of pairs by RSI, trend, breakout state, volume and market cap in one table." },
  { icon: Newspaper, title: "News with context", text: "Every headline tagged with sentiment, related assets and expected market impact." },
  { icon: Bell, title: "Alerts & saved work", text: "Track levels, indicators and research notes across watchlists that stay in sync." },
];

function Landing() {
  const top = assets.slice(0, 6);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Flame className="size-4.5" />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight">Cryptolytic</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">
              Sign in
            </Link>
            <Link
              to="/market"
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open terminal
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px]" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Analysis-only platform · no trading execution
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Read the market
              <span className="block text-muted-foreground">before it moves.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              A market intelligence terminal for crypto research: technical structure, sentiment, dominance, news impact
              and AI-assisted analysis in one dense, quiet interface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/market"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Launch market overview <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/chart"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40"
              >
                Explore charts
              </Link>
            </div>

            <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                ["Market cap", fmtCompact(globalStats.marketCap)],
                ["24h volume", fmtCompact(globalStats.volume24h)],
                ["BTC dominance", `${globalStats.btcDominance}%`],
                ["Fear & Greed", `${globalStats.fearGreed} · ${globalStats.fearGreedLabel}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="num mt-1 text-lg font-semibold tracking-tight">{v}</dd>
                </div>
              ))}
            </dl>
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
                  {a.price >= 1 ? `$${a.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${a.price}`}
                </p>
                <Sparkline data={a.spark} positive={a.change24h >= 0} className="mt-2 h-7" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Everything an analyst needs. Nothing they don't.</h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          No order tickets, no wallets, no noise. Cryptolytic is built for the part of the job that actually decides
          outcomes — understanding the market.
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

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-8 sm:px-6">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cryptolytic. Market data shown is illustrative.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/news" className="hover:text-foreground">News</Link>
            <Link to="/screener" className="hover:text-foreground">Screener</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
