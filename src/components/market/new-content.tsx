import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Landmark,
  Newspaper,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoopingVideo } from "@/components/layout/looping-video";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge, Panel } from "@/components/market/ui";
import { LiveBadge } from "@/components/market/live-badge";
import { Sparkline } from "@/components/market/sparkline";
import {
  fmtCompact,
  fmtDominance,
  fmtPrice,
  type Asset,
  type GlobalStats,
} from "@/lib/market-data";
import { stockTickers, useLiveTickers } from "@/lib/global-market";
import {
  finnhubApi,
  type CompanyFundamentals,
  type FinnhubEvent,
  type FinnhubEvents,
  type FinnhubNewsHeadline,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import newVideo from "@/Video/new.mp4";

// ---------------------------------------------------------------------------
// New — video showcase, realtime strip & live research panels
//
// Shared by the marketing /new page and the console's "New" section. Both
// render the exact same data (the Data API); only the hero's CTA targets
// differ so each destination keeps users where they are.
// ---------------------------------------------------------------------------

export function VideoShowcase({ consoleMode = false }: { consoleMode?: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_50px_100px_-45px_rgba(0,0,0,0.8)]">
      <div className="relative aspect-[16/9] overflow-hidden sm:aspect-[21/9]">
        <LoopingVideo
          src={newVideo}
          preload="auto"
          overlayClassName="bg-black/35"
          label="Cryptolytic product showcase video"
        />
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-6 pt-24 sm:p-10 sm:pt-32">
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-black/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md">
              <Sparkles className="size-3.5 text-primary" />
              What's new
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-medium text-primary backdrop-blur-md">
              <Rocket className="size-3.5" />
              v3.2 · Live providers
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-black/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md">
              <CalendarDays className="size-3.5" />
              Aug 10, 2026
            </span>
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Fresh from the terminal.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Every release ships through the same tool we use ourselves — here's what changed, and
            what's live in the market right now.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {consoleMode ? (
              // Console mode stays inside the terminal: explore the market overview.
              <Link
                to="/market"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Explore the market <ArrowRight className="size-4" />
              </Link>
            ) : (
              // Marketing mode keeps users on the homepage: tab between New / Pricing / Market.
              <>
                <Link
                  to="/new"
                  search={{ tab: "market" }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Explore the market <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/new"
                  search={{ tab: "pricing" }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-black/30 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-primary/40"
                >
                  See pricing
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-3">
        {[
          ["Live by default", "Binance prices refreshed every 5–10s"],
          ["Provider failover", "Yahoo ⇄ Finnhub · exchangerate-api ⇄ Frankfurter"],
          ["Server-side data", "The terminal never calls an exchange directly"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-0.5 text-sm">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="num mt-1.5 truncate text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function LiveMarketsStrip({
  top,
  stats,
  movers,
}: {
  top: Asset[];
  stats: GlobalStats;
  movers: Asset[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Live markets, right now
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Realtime prices from the terminal — the same data the console uses.
          </p>
        </div>
        <LiveBadge />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {top.map((a) => (
          <div key={a.id} className="panel p-3.5 transition-colors hover:border-primary/30">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold">{a.symbol}</span>
              <ChangeBadge value={a.change24h} />
            </div>
            <p className="num mt-2 text-sm font-semibold">{fmtPrice(a.price)}</p>
            <Sparkline data={a.spark} positive={a.change24h >= 0} className="mt-2 h-7" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Market cap" value={fmtCompact(stats.marketCap)} />
        <StatTile label="24h volume" value={fmtCompact(stats.volume24h)} />
        <StatTile label="BTC dominance" value={fmtDominance(stats.btcDominance)} />
        <StatTile label="Fear & Greed" value={`${stats.fearGreed} · ${stats.fearGreedLabel}`} />
      </div>

      <div className="panel">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Biggest movers — 24h</p>
        </div>
        <ul className="divide-y divide-border">
          {movers.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <AssetLogo asset={a} className="size-6 rounded-md" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.symbol}</span>
              <span className="num text-sm text-muted-foreground">{fmtPrice(a.price)}</span>
              <ChangeBadge value={a.change24h} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// New Realtime — Finnhub research (server-side key, cached by the backend)
// ---------------------------------------------------------------------------

const FINNHUB_COMPANIES = stockTickers.map((t) => ({ symbol: t.symbol, name: t.name }));

function fmtEventDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeAgo(unix: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - unix);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtPctVal(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/** "US" → 🇺🇸 (regional-indicator flag emoji). */
function flagEmoji(cc: string): string {
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

function EventSourceBadge({ source }: { source: FinnhubEvents["source"] }) {
  if (source === "unavailable") {
    return (
      <span className="rounded-md bg-down/10 px-2 py-0.5 text-[10px] font-medium text-down">
        Unavailable
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-medium",
        source === "economic" ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground",
      )}
    >
      {source === "economic" ? "Macro calendar" : "Earnings calendar"}
    </span>
  );
}

function EventRow({ e }: { e: FinnhubEvent }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5">
      <div className="w-16 shrink-0">
        <p className="num text-xs font-semibold">{fmtEventDate(e.date)}</p>
        <p className="text-[10px] text-muted-foreground">{e.time || "All day"}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{e.event}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {e.kind === "economic" ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <span aria-hidden>{flagEmoji(e.country)}</span>
              {e.country || "Global"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {e.symbol}
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              e.kind === "economic"
                ? "bg-primary/10 text-primary"
                : "bg-accent text-muted-foreground",
            )}
          >
            {e.kind === "economic" ? "Macro" : "Earnings"}
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-right sm:flex">
        {[
          ["Est", e.estimate],
          ["Prev", e.prev],
          ["Act", e.actual],
        ].map(([label, v]) => (
          <div key={label as string} className="w-14">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
            <p className="num truncate text-xs font-medium">{fmtNum(v as number | null)}</p>
          </div>
        ))}
      </div>
    </li>
  );
}

function EventsCalendarPanel() {
  const [data, setData] = useState<FinnhubEvents | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    finnhubApi
      .events()
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 10 * 60_000); // backend caches 10m
    return () => window.clearInterval(id);
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data?.events ?? []).filter((e) => e.date >= today).slice(0, 10);
  const shown = upcoming.length > 0 ? upcoming : (data?.events ?? []).slice(0, 10);

  return (
    <Panel
      title="Economic Calendar"
      description="Upcoming macro & earnings events · Finnhub"
      action={data ? <EventSourceBadge source={data.source} /> : undefined}
      bodyClassName="p-0"
    >
      {error && (
        <p className="flex items-center gap-2 px-5 py-6 text-xs text-muted-foreground">
          <Landmark className="size-4 text-muted-foreground/60" />
          Finnhub is unreachable right now — the calendar will retry automatically.
        </p>
      )}
      {!error && !data && (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )}
      {!error && data && shown.length === 0 && (
        <p className="px-5 py-6 text-center text-xs text-muted-foreground">
          No events in the next two weeks. Check back soon.
        </p>
      )}
      {!error && data && shown.length > 0 && (
        <ul className="divide-y divide-border">
          {shown.map((e) => (
            <EventRow key={e.id} e={e} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function FundamentalRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 text-xs">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="num font-semibold tracking-tight">
        {value}
        {hint && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

function FundamentalsPanel() {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState<CompanyFundamentals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const live = useLiveTickers("stocks", true).find((t) => t.symbol === symbol);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    finnhubApi
      .fundamentals(symbol)
      .then((f) => {
        if (cancelled) return;
        setData(f);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const up = (live?.change ?? 0) >= 0;

  return (
    <Panel
      title="Company Fundamentals"
      description="Key valuation & profitability metrics · Finnhub"
      bodyClassName="p-0"
    >
      <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-4 sm:px-5">
        {FINNHUB_COMPANIES.map((c) => (
          <button
            key={c.symbol}
            type="button"
            onClick={() => setSymbol(c.symbol)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
              symbol === c.symbol
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {c.symbol}
          </button>
        ))}
      </div>

      <div className="border-t border-border px-4 py-3 sm:px-5">
        {live && (
          <div className="flex items-baseline gap-2">
            <p className="num text-lg font-semibold tracking-tight">${fmtNum(live.price, 2)}</p>
            <span className={cn("text-xs font-medium", up ? "text-up" : "text-down")}>
              {up ? "+" : ""}
              {live.change.toFixed(2)}%
            </span>
            <span className="truncate text-[11px] text-muted-foreground">live</span>
          </div>
        )}
        {loading && (
          <div className="space-y-2.5 pt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}
        {error && !loading && (
          <p className="py-4 text-xs text-muted-foreground">
            Fundamentals unavailable — try another ticker or refresh later.
          </p>
        )}
        {data && !loading && (
          <dl className="mt-2 space-y-2.5">
            <FundamentalRow
              label="P/E (TTM)"
              value={data.peTTM ? `${data.peTTM.toFixed(1)}×` : "—"}
            />
            <FundamentalRow
              label="EPS (TTM)"
              value={data.epsTTM ? `$${fmtNum(data.epsTTM)}` : "—"}
            />
            <FundamentalRow label="EPS growth (3Y)" value={fmtPctVal(data.epsGrowth3Y)} />
            <FundamentalRow label="Revenue growth (3Y)" value={fmtPctVal(data.revenueGrowth3Y)} />
            <FundamentalRow
              label="Dividend yield"
              value={data.dividendYield ? `${data.dividendYield.toFixed(2)}%` : "—"}
            />
            <FundamentalRow label="Beta" value={data.beta ? data.beta.toFixed(2) : "—"} />
            <FundamentalRow
              label="ROE (TTM)"
              value={data.roeTTM ? `${data.roeTTM.toFixed(1)}%` : "—"}
            />
            <FundamentalRow
              label="Gross margin"
              value={data.grossMargin ? `${data.grossMargin.toFixed(1)}%` : "—"}
            />
            <FundamentalRow
              label="Current ratio"
              value={data.currentRatio ? data.currentRatio.toFixed(2) : "—"}
            />
            <FundamentalRow
              label="52-week range"
              value={`$${fmtNum(data.week52Low)} – $${fmtNum(data.week52High)}`}
              {...(data.week52LowDate && data.week52HighDate
                ? { hint: `${data.week52LowDate} / ${data.week52HighDate}` }
                : {})}
            />
          </dl>
        )}
      </div>
    </Panel>
  );
}

function MarketNewsPanel() {
  const [items, setItems] = useState<FinnhubNewsHeadline[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    finnhubApi
      .news()
      .then((n) => {
        setItems(n.slice(0, 8));
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5 * 60_000); // backend caches 5m
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <Panel
      title="Market News"
      description="Headlines across global markets · Finnhub"
      action={
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Refresh news"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      }
      bodyClassName="p-0"
    >
      {error && (
        <p className="px-5 py-6 text-center text-xs text-muted-foreground">
          Headlines are temporarily unavailable — pull to refresh in a moment.
        </p>
      )}
      {!error && !items && (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-11 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!error && items && items.length === 0 && (
        <p className="px-5 py-6 text-center text-xs text-muted-foreground">
          No headlines right now.
        </p>
      )}
      {!error && items && items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30 sm:px-5"
              >
                {n.image ? (
                  <img
                    src={n.image}
                    alt=""
                    loading="lazy"
                    className="mt-0.5 size-11 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground">
                    <Newspaper className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                    {n.headline}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{n.source}</span>
                    <span
                      aria-hidden
                      className="size-0.5 shrink-0 rounded-full bg-muted-foreground/40"
                    />
                    <span className="shrink-0">{timeAgo(n.time)}</span>
                  </p>
                </div>
                <ExternalLink className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function FinnhubRealtimeSection() {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">New realtime</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Economic calendar, company fundamentals and market headlines — powered by Finnhub,
            fetched server-side.
          </p>
        </div>
        <LiveBadge />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <EventsCalendarPanel />
        </div>
        <div className="min-w-0">
          <FundamentalsPanel />
        </div>
      </div>
      <MarketNewsPanel />
    </section>
  );
}
