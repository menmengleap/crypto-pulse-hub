import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Rocket } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Cryptolytic" },
      {
        name: "description",
        content:
          "Verified system updates, changelog and product announcements from the Cryptolytic team.",
      },
      { property: "og:title", content: "Blog — Cryptolytic" },
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
};

const posts: Post[] = [
  {
    id: "global-markets",
    tag: "Feature",
    date: "Aug 9, 2026",
    title: "Global markets: stocks & forex now live on the Market page",
    excerpt:
      "The Market page now covers crypto, US equities and major forex pairs — with real-time prices, 24h volume and sparklines on every ticker.",
    body: [
      "Market Overview now has three tabs: Crypto, Stocks and Forex. Crypto streams live spot prices from Binance; stocks and forex tickers update every few seconds so you always see current money amounts.",
      "Every ticker row carries price, change, 24h volume and a sparkline, and the same data powers the console — one source of truth for the whole platform.",
    ],
  },
  {
    id: "live-charts",
    tag: "Release",
    date: "Jul 28, 2026",
    title: "Realtime klines & live chart updates",
    excerpt:
      "Charts now stream live candles from Binance instead of generated demo data, with a Live indicator on the chart frame.",
    body: [
      "Advanced Chart now subscribes to the exchange stream directly: open a symbol, pick a timeframe, and watch the last candle update in real time.",
      "If the connection drops, the chart falls back gracefully to the last snapshot instead of going blank.",
    ],
  },
  {
    id: "pricing-open",
    tag: "Feature",
    date: "Jul 15, 2026",
    title: "Pricing is open — Free, Starter and Advance",
    excerpt:
      "Three honest plans: a free tier for exploring the terminal, a Starter plan for active analysts, and Advance for desks that need it all.",
    body: [
      "The terminal stays read-only on every plan — we analyze, we never trade for you. Yearly billing saves 20%.",
      "Free accounts keep full access to live charts, sentiment and news; alerts and AI analysis scale with your plan.",
    ],
  },
  {
    id: "faster-snapshots",
    tag: "Fix",
    date: "Jul 2, 2026",
    title: "Faster snapshots, fewer stale prices",
    excerpt:
      "Market-cap and global-stats snapshots now refresh on a tighter cadence with graceful fallback when CoinGecko is slow.",
    body: [
      "Market cap, dominance and Fear & Greed used to refresh on a fixed five-minute timer; they now update opportunistically whenever new data arrives.",
      "If a snapshot fails, the terminal keeps the last known values instead of zeroing out cards.",
    ],
  },
  {
    id: "ai-engine",
    tag: "Release",
    date: "Jun 20, 2026",
    title: "AI analysis engine v2",
    excerpt:
      "Structured multi-timeframe reads on trend, momentum and key levels — written like a desk note, not a generic chatbot answer.",
    body: [
      "The AI analyst now reasons over the actual chart state (trend, RSI, structure) and returns a compact, dated note you can save to your watchlist.",
      "Token budgets and rate limits are enforced per plan so the terminal stays fast for everyone.",
    ],
  },
  {
    id: "meet-the-team",
    tag: "Update",
    date: "Jun 5, 2026",
    title: "Meet the team behind the terminal",
    excerpt:
      "Cryptolytic is three people with one idea: market intelligence should be precise, fast and honest.",
    body: [
      "Hover a face on the homepage to meet the founders — the builder, the trader, and the storyteller who keeps the signal loud and the noise out.",
    ],
  },
];

function tagClass(tag: Post["tag"]) {
  return tag === "Feature"
    ? "bg-up/10 text-up"
    : tag === "Fix"
      ? "bg-down/10 text-down"
      : "bg-primary/10 text-primary";
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
        </div>
        <h2
          className={cn(
            "mt-3 font-semibold tracking-tight",
            featured ? "text-xl sm:text-2xl" : "text-base",
          )}
        >
          {post.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>{" "}
        {featured && (
          <div className="mt-4 space-y-3">
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

function BlogPage() {
  const featured = posts[0];
  const rest = posts.slice(1);
  return (
    <MarketingLayout className="max-w-4xl space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Rocket className="size-3.5 text-primary" />
          Blog
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          System updates & changelog
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Verified releases, fixes and product announcements — straight from the team.
        </p>
      </div>

      {featured && <PostCard post={featured} featured />}

      <div className="grid gap-4 md:grid-cols-2">
        {rest.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>

      <div className="panel flex items-start gap-3 p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Rocket className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">What's next</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Derivatives analytics, portfolio-sync watchlists and a proper mobile layout are on the
            roadmap. Follow the releases here — or{" "}
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
