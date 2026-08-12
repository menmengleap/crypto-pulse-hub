import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Cpu,
  GitBranch,
  Rocket,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Changelog & Blog — Cryptolytic" },
      {
        name: "description",
        content:
          "Verified system updates, changelog, bug fixes and product announcements from the Cryptolytic team.",
      },
      { property: "og:title", content: "Changelog & Blog — Cryptolytic" },
    ],
  }),
  component: BlogPage,
});

type Post = {
  id: string;
  tag: "Feature" | "Fix" | "Release" | "Update";
  date: string;
  title: string;
  excerpt: string;
  body: string[];
  /** Optional version badge shown next to the date (e.g. "v0.6.12"). */
  version?: string;
};

const posts: Post[] = [
  {
    id: "pro-trading-terminal",
    tag: "Feature",
    date: "Aug 12, 2026",
    title: "Cryptolytic Professional AI Trading Terminal",
    excerpt:
      "The console is now a full-screen, TradingView-style trading terminal — a dominant live chart with drawing tools, indicators, an AI analysis sidebar, a resizable screener workspace and a market ticker.",
    body: [
      "The console has been rebuilt as a professional trading terminal. The chart is now the primary workspace and claims the full viewport — every surrounding panel (left drawing rail, right AI analysis sidebar, bottom workspace) can be toggled independently, and when you close them all the chart expands to fill the screen.",
      "The chart toolbar carries the live symbol and price, every timeframe from 1m to 1W, indicators computed by the Python microservice (SMA, EMA, Bollinger, RSI, MACD, ATR, Stochastic, OBV), drawing tools, compare, alerts, replay/pause and chart style settings. A narrow left rail gives one-click access to the drawing tools — trend, horizontal, vertical, ray, rectangle and Fibonacci.",
      "The right sidebar runs an AI market analysis on the active asset: bias, trend, momentum, market structure, key levels and an AI confidence gauge, plus the latest headlines. The bottom workspace holds six tools — Screener, Performance, Technicals, Indicators, Strategy and Trading — in a band you can drag to resize.",
      "Your workspace preferences persist across reloads (panel toggles, sizes and the active tab), focus mode hides the chrome for a pure chart, and the AI research chat is one click away as an overlay when you want to ask the market anything.",
    ],
  },
  {
    id: "console-ai-chat",
    tag: "Feature",
    date: "Aug 12, 2026",
    title: "The terminal is now one screen — the Advanced Chat, with live prices",
    excerpt:
      "Every console page was consolidated into a single full-screen chat: a live price ticker runs across the top, and the assistant answers on prices, movers, fear & greed, dominance, the cycle, news and desk notes.",
    body: [
      "The console is now one screen: the Advanced Chat, full-screen, with a live price ticker running along the top. All the former console pages — market overview, spot, derivatives, assets, fear & greed, sentiment, cycle, dominance, heatmap, compare, chart, news, watchlist, screener, alerts, saved, profile and settings — were consolidated into the chat itself.",
      "The ticker streams the top crypto prices in a seamless marquee; clicking any asset asks the assistant about it. The assistant still answers on live prices, biggest movers, the fear & greed gauge, BTC/ETH dominance, the market cycle, live headlines and server-side desk notes saved to your analysis library.",
      "Old console links and bookmarks now redirect into the chat, and the homepage's market tools stay exactly where they are — the full market suite lives on the homepage at /markets/*, one deliberate click from the terminal.",
    ],
  },
  {
    id: "homepage-market-hub",
    tag: "Feature",
    date: "Aug 12, 2026",
    title: "A Market hub on the homepage — the terminal's tools, without the sign-in",
    excerpt:
      "The homepage navbar's Market item now opens a dropdown of ten market tools, each rendered with the exact same UI and live data as its console page — right on the homepage.",
    body: [
      "The homepage navbar's Market item is now a dropdown with ten market tools: Market Overview, Spot Market, Derivatives Market, Crypto Assets, Fear & Greed, Market Sentiment, Market Cycle, Bitcoin Dominance, Market Heatmap and Compare.",
      "Every tool renders the exact same components and live data as its console page — the homepage and the terminal share one data source, as two destinations. Clicking Market on the homepage keeps you on the homepage; opening the same tools from the console sidebar keeps you in the console.",
      "Visitors can explore the full market suite without an account. Each page carries an 'Open in terminal' button that sends signed-in users straight to the same page inside the terminal.",
    ],
  },
  {
    id: "v0.6.12",
    tag: "Release",
    version: "v0.6.12",
    date: "Aug 11, 2026",
    title: "Version 0.6.12 — a quieter, faster homepage and a market analyst's dashboard",
    excerpt:
      "Full-screen hero video, a Bloomberg-style Market Summary dashboard, a live 10-pair crypto row, an Audience ⇄ Economy map switcher and a decluttered, session-aware navbar.",
    body: [
      "The homepage is quieter and denser. The hero now runs a full-screen product video, section-label pills and decorative chips are gone, and every section heading aligns left — the page reads like a terminal, not a landing deck.",
      "A new 'Market Summary' dashboard sits under the live pairs: an S&P 500 intraday chart, major indices, crypto market cap with BTC/ETH/others dominance, the US Dollar Index with futures, and the US 10Y yield with inflation — all driven by a single typed mock-data module that's ready to be wired to a real market-data API.",
      "The live crypto row streams the ten pairs that matter — BTC, ETH, PEPE, BNB, XRP, ARB, OP, SOL, DOGE, USDT — in one straight line that glides left and right, with prices ticking straight from the backend.",
      "The Audience section gained an Audience ⇄ Economy switcher: the sessions heatmap now sits next to a global inflation heatmap (darker = higher CPI), both hoverable and explorable.",
      "The navbar was cleaned up — logo and nav boxes removed, more breathing room between elements, and the CTA is now session-aware: visitors see 'Sign up', signed-in users see 'Open terminal'. The logo's ring boxes were removed across the navbar, footer and console.",
    ],
  },
  {
    id: "new-page-refresh",
    tag: "Update",
    date: "Aug 11, 2026",
    title: "A cleaner 'New' experience — homepage decluttered, console News carries the feed",
    excerpt:
      "The New homepage dropped its news, ad and release boxes for a tighter live-data flow, and the console's News page now shows the same content behind the session.",
    body: [
      "The New homepage was decluttered: the static verified-news feed, ad network panel and news search box were removed, and the 'What's new' release-timeline boxes went too. The page now runs straight off live data — product video, realtime markets and Finnhub research panels.",
      "The console's News page (under Research) now carries the exact same components and Data API as the homepage's New page, behind the sign-in gate — no separate console 'New' entry in the sidebar. The two stay separate by design: clicking 'New' on the homepage keeps you on the homepage, and clicking 'News' in the console keeps you in the console — one data source, two destinations, no redirects between them.",
    ],
  },
  {
    id: "indicators-live",
    tag: "Release",
    date: "Aug 10, 2026",
    title: "Technical indicators now compute live — 8 indicators from scratch",
    excerpt:
      "SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic and OBV are now calculated server-side by a dedicated Python service and rendered straight onto the Advanced Chart.",
    body: [
      "Every indicator is computed from first principles (pure pandas/numpy — no third-party indicator libraries) by a new microservice behind the Go API gateway, so the browser never talks to it directly. Warm-up values are trimmed automatically, so every line you see is meaningful.",
      "Indicators render where they belong: moving averages and Bollinger Bands overlay price, while RSI, MACD, ATR, Stochastic and OBV each get their own pane below the candles with reference guides (RSI 30/70, Stochastic 20/80).",
      "If the indicator service is ever unreachable, the chart stays fully usable with candles and volume instead of erroring out — we never show fabricated data.",
    ],
  },
  {
    id: "provider-failover",
    tag: "Feature",
    date: "Aug 8, 2026",
    title: "Markets that never go quiet: automatic provider failover",
    excerpt:
      "Crypto, forex and stocks now stream from primary providers with automatic fallbacks, so a single upstream outage can't blank your market data.",
    body: [
      "Crypto quotes stream from Binance public market data. Forex comes from exchangerate-api with automatic failover to Frankfurter (and back); stocks come from Yahoo Finance with failover to Finnhub (and back).",
      "Each asset class refreshes on its own cadence — crypto every 5–10 s, forex every 15–30 s, stocks every 30–60 s — tuned so the terminal stays fresh without hammering upstream APIs.",
    ],
  },
  {
    id: "rate-limit-fix",
    tag: "Fix",
    date: "Aug 5, 2026",
    title: "No more 429s: bulk data feeds and background market workers",
    excerpt:
      "The terminal used to fire one request per symbol on load, which tripped rate limits and caused fetch loops. Now the backend prefetches into a cache and the frontend pulls everything in one bulk call.",
    body: [
      "Background workers refresh market data on fixed intervals and serve every request from cache, so per-symbol round-trips to upstream providers are gone entirely.",
      "On the frontend, individual symbol requests were combined into a single bulk endpoint and effect dependency arrays were fixed, killing the infinite fetch loops that made the UI stutter.",
    ],
  },
  {
    id: "health-checks",
    tag: "Fix",
    date: "Aug 3, 2026",
    title: "Health checks & warm wake-ups: no more 404s on /health",
    excerpt:
      "The backend now exposes a real /health endpoint and the gateway keeps its services warm, so cold starts stop interrupting the first request after idle.",
    body: [
      "A dedicated /health route returns a clean 200 with service status, and the frontend polls it on a sane 30–60 s interval instead of spamming it.",
      "The indicator gateway pings the Python service every minute to keep the free instance awake, and API clients tolerate a cold-start window instead of timing out instantly.",
    ],
  },
  {
    id: "auth-loop",
    tag: "Fix",
    date: "Jul 30, 2026",
    title: "Sign-in redirect loop fixed",
    excerpt:
      "Protected routes now wait for the session to finish loading before deciding where to send you — no more ping-pong between /login and the console.",
    body: [
      "The guard previously checked auth before the token finished loading from storage, bouncing signed-in users to /login while /login bounced them straight back. Both sides now coordinate on a hydration flag, and redirects use history-safe replacement.",
    ],
  },
  {
    id: "real-profile",
    tag: "Update",
    date: "Jul 26, 2026",
    title: "Profile now pulls your real account data",
    excerpt:
      "Your name, avatar and member-since date in the console sidebar and navbar now come from the database — not placeholders.",
    body: [
      "The console sidebar reads your live profile (name, avatar, registration date) from the backend on every visit, and the Settings page lets you change your display picture — it updates everywhere instantly.",
    ],
  },
];

const filters = [
  { id: "all", label: "All" },
  { id: "Release", label: "Releases" },
  { id: "Feature", label: "Features" },
  { id: "Fix", label: "Fixes" },
  { id: "Update", label: "Updates" },
] as const;

function tagClass(tag: Post["tag"]) {
  switch (tag) {
    case "Release":
      return "bg-up/10 text-up";
    case "Fix":
      return "bg-down/10 text-down";
    case "Update":
      return "bg-btc/10 text-btc";
    default:
      return "bg-primary/10 text-primary";
  }
}

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <article className="panel overflow-hidden transition-all duration-300 hover:border-primary/35">
      <div className={cn("p-6", featured && "lg:p-8")}>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={cn("rounded-md px-2 py-0.5 font-medium", tagClass(post.tag))}>
            {post.tag}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="size-3" />
            {post.date}
          </span>
          {post.version && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              <GitBranch className="size-3" />
              {post.version}
            </span>
          )}
        </div>
        <h2
          className={cn(
            "mt-3 font-semibold tracking-tight",
            featured ? "text-xl sm:text-2xl" : "text-base",
          )}
        >
          {post.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
        {featured && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {post.body.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

const changes: {
  heading: string;
  icon: LucideIcon;
  tone: string;
  items: string[];
}[] = [
  {
    heading: "New features",
    icon: Sparkles,
    tone: "text-up",
    items: [
      "8 technical indicators computed live by a Python microservice",
      "Crypto, forex & stock coverage with automatic provider failover",
      "Overlay & sub-pane indicator rendering on the Advanced Chart",
      "Real profile data (name, avatar, member since) from the database",
      "Console 'News' section — the homepage's New feed, inside the terminal",
      "Homepage Market hub — ten terminal market tools on the public site",
    ],
  },
  {
    heading: "Bug fixes",
    icon: Wrench,
    tone: "text-down",
    items: [
      "429 rate limits — bulk feeds & background market workers",
      "Infinite /login ⇄ console redirect loop",
      "Missing /health endpoint returning 404",
      "Chart crash when toggling indicator panes",
    ],
  },
  {
    heading: "Under the hood",
    icon: Cpu,
    tone: "text-primary",
    items: [
      "Go gateway → Python service architecture (never direct to providers)",
      "Server-side caching with background refresh tickers",
      "Static JWT secret config + automatic token refresh on 401",
      "Graceful fallbacks everywhere — no fabricated data",
    ],
  },
];

function BlogPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = filter === "all" ? posts : posts.filter((p) => p.tag === filter);
  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <MarketingLayout className="max-w-5xl space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Rocket className="size-3.5 text-primary" />
          Changelog & Blog
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          What changed at Cryptolytic
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Releases, bug fixes and product announcements — straight from the team, in order.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {[
            ["posts", posts.length],
            ["releases", posts.filter((p) => p.tag === "Release").length],
            ["fixes", posts.filter((p) => p.tag === "Fix").length],
          ].map(([label, n]) => (
            <span
              key={label as string}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground"
            >
              <Activity className="size-3.5" />
              <span className="num font-semibold text-foreground">{n}</span> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {featured ? (
        <>
          <PostCard post={featured} featured />
          {rest.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {rest.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          No posts in this category yet.
        </div>
      )}

      {/* What changed recently — features vs fixes vs plumbing */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">What changed recently</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {changes.map((c) => (
            <div
              key={c.heading}
              className="panel p-5 transition-all duration-300 hover:border-primary/35"
            >
              <div className="flex items-center gap-2">
                <c.icon className={cn("size-4", c.tone)} />
                <p className="text-sm font-semibold">{c.heading}</p>
              </div>
              <ul className="mt-3 space-y-2.5">
                {c.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <CheckCircle2 className={cn("mt-0.5 size-3.5 shrink-0", c.tone)} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="panel flex items-start gap-3 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Rocket className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">What's next</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The indicator service is ready to deploy (see the release notes above). Derivatives
            analytics, portfolio-sync watchlists and a proper mobile layout are on the roadmap.
            Follow the releases here — or{" "}
            <Link to="/register" className="text-primary hover:underline">
              create an account
            </Link>{" "}
            to try today's build.
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
