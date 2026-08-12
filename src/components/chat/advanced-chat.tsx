import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUp,
  Brain,
  ExternalLink,
  GitCompareArrows,
  Gauge,
  LineChart,
  Newspaper,
  PieChart,
  Sparkles,
  TrendingUp,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AccountMenu, Brand } from "@/components/layout/app-shell";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge, SentimentGauge, TrendBadge } from "@/components/market/ui";
import { Sparkline } from "@/components/market/sparkline";
import {
  dominanceHistory,
  fearGreedHistory7,
  fmtCompact,
  fmtPrice,
  marketCyclePhases,
  type Asset,
  type GlobalStats,
} from "@/lib/market-data";
import { respondTo, timeAgo, type ChatMessage } from "@/lib/chat-ai";
import type { FinnhubNewsHeadline } from "@/lib/api";
import { marketPages } from "@/lib/market-routes";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "cryptolytic.chat.v1";

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SUGGESTIONS = [
  "How is BTC doing?",
  "Show me the top movers",
  "Fear & Greed right now",
  "Bitcoin dominance",
  "What phase of the market cycle?",
  "Compare ETH and SOL",
  "Latest market news",
  "Analyze ETH",
];

const CAPABILITIES: { icon: LucideIcon; title: string; desc: string; prompt: string }[] = [
  {
    icon: LineChart,
    title: "Live prices",
    desc: "Any asset — price, change, volume, RSI and trend.",
    prompt: "How is BTC doing?",
  },
  {
    icon: TrendingUp,
    title: "Movers",
    desc: "The biggest 24h gainers and losers.",
    prompt: "Show me the top movers",
  },
  {
    icon: Gauge,
    title: "Fear & Greed",
    desc: "Market emotion with history.",
    prompt: "Fear & Greed right now",
  },
  {
    icon: PieChart,
    title: "Dominance",
    desc: "BTC vs ETH vs the rest.",
    prompt: "Bitcoin dominance",
  },
  {
    icon: Waves,
    title: "Market cycle",
    desc: "Where we are in the cycle.",
    prompt: "What phase of the market cycle?",
  },
  { icon: Newspaper, title: "News", desc: "Latest headlines, live.", prompt: "Latest market news" },
  {
    icon: GitCompareArrows,
    title: "Compare",
    desc: "Two assets side by side.",
    prompt: "Compare ETH and SOL",
  },
  {
    icon: Brain,
    title: "Desk notes",
    desc: "Server-side technical reads, saved.",
    prompt: "Analyze ETH",
  },
];

// ---------------------------------------------------------------------------
// Rich cards
// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="truncate text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd className="num mt-0.5 truncate text-sm font-semibold">{value}</dd>
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  const up = asset.change24h >= 0;
  return (
    <div className="mt-3 panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AssetLogo asset={asset} className="size-10 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {asset.symbol}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">{asset.name}</span>
            </p>
            <p className="num mt-0.5 text-lg font-semibold tracking-tight">
              {fmtPrice(asset.price)}
              <ChangeBadge value={asset.change24h} className="ml-2" />
            </p>
          </div>
        </div>
        <TrendBadge trend={asset.trend} />
      </div>
      <Sparkline data={asset.spark} positive={up} className="mt-3 h-12" />
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
        <Stat label="Market cap" value={fmtCompact(asset.marketCap)} />
        <Stat label="Volume 24h" value={fmtCompact(asset.volume24h)} />
        <Stat label="RSI (14)" value={asset.rsi.toFixed(1)} />
        <Stat label="Momentum" value={asset.momentum} />
      </dl>
    </div>
  );
}

function MoversCard({ movers }: { movers: Asset[] }) {
  return (
    <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
      {movers.map((a) => (
        <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
          <AssetLogo asset={a} className="size-6 rounded-md" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {a.symbol}
            <span className="ml-1.5 text-[11px] text-muted-foreground">{a.name}</span>
          </span>
          <span className="num text-sm text-muted-foreground">{fmtPrice(a.price)}</span>
          <ChangeBadge value={a.change24h} />
        </li>
      ))}
    </ul>
  );
}

function GlobalCard({ global }: { global: GlobalStats }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="panel p-3.5">
        <Stat label="Market cap" value={fmtCompact(global.marketCap)} />
      </div>
      <div className="panel p-3.5">
        <Stat label="24h volume" value={fmtCompact(global.volume24h)} />
      </div>
      <div className="panel p-3.5">
        <Stat label="BTC dominance" value={`${global.btcDominance}%`} />
      </div>
      <div className="panel p-3.5">
        <Stat label="Fear & Greed" value={`${global.fearGreed} · ${global.fearGreedLabel}`} />
      </div>
    </div>
  );
}

function FearCard({ global }: { global: GlobalStats }) {
  return (
    <div className="mt-3 panel p-4">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <SentimentGauge score={global.fearGreed} label={global.fearGreedLabel} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">7-day history</p>
          <Sparkline data={fearGreedHistory7} positive className="mt-2 h-24" strokeWidth={2} />
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
            {fearGreedHistory7.map((v, i) => (
              <span key={i} className="num">
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DominanceCard({ global }: { global: GlobalStats }) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-3.5">
          <Stat label="BTC" value={`${global.btcDominance}%`} />
        </div>
        <div className="panel p-3.5">
          <Stat label="ETH" value={`${global.ethDominance}%`} />
        </div>
        <div className="panel p-3.5">
          <Stat label="Other" value={`${global.otherDominance}%`} />
        </div>
      </div>
      <div className="panel p-4">
        <p className="text-xs text-muted-foreground">8-month BTC dominance</p>
        <Sparkline
          data={dominanceHistory.map((d) => d.btc)}
          positive
          className="mt-2 h-24"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}

function CycleCard() {
  return (
    <div className="mt-3 panel space-y-4 p-4">
      {marketCyclePhases.map((p) => (
        <div key={p.phase}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
            <span className="truncate font-medium">{p.phase}</span>
            <span className="text-xs text-muted-foreground">{p.note}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                p.progress === 100 ? "bg-muted-foreground/50" : "bg-primary",
              )}
              style={{ width: `${p.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsCard({ items }: { items: FinnhubNewsHeadline[] }) {
  if (items.length === 0) {
    return <p className="mt-3 text-xs text-muted-foreground">No headlines right now.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
      {items.map((n) => (
        <li key={n.id}>
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
          >
            {n.image ? (
              <img
                src={n.image}
                alt=""
                loading="lazy"
                className="mt-0.5 size-10 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground">
                <Newspaper className="size-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
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
  );
}

function CompareCard({ a, b }: { a: Asset; b: Asset }) {
  const rows: [string, string, string][] = [
    ["Price", fmtPrice(a.price), fmtPrice(b.price)],
    [
      "24h",
      `${a.change24h >= 0 ? "+" : ""}${a.change24h.toFixed(2)}%`,
      `${b.change24h >= 0 ? "+" : ""}${b.change24h.toFixed(2)}%`,
    ],
    [
      "7d",
      `${a.change7d >= 0 ? "+" : ""}${a.change7d.toFixed(2)}%`,
      `${b.change7d >= 0 ? "+" : ""}${b.change7d.toFixed(2)}%`,
    ],
    ["Market cap", fmtCompact(a.marketCap), fmtCompact(b.marketCap)],
    ["Volume 24h", fmtCompact(a.volume24h), fmtCompact(b.volume24h)],
    ["RSI (14)", a.rsi.toFixed(1), b.rsi.toFixed(1)],
    ["Trend", a.trend, b.trend],
    ["Momentum", a.momentum, b.momentum],
  ];
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface/60">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Metric
            </th>
            <th className="px-4 py-2.5 text-right">
              <span className="inline-flex items-center gap-1.5">
                <AssetLogo asset={a} className="size-4 rounded" /> {a.symbol}
              </span>
            </th>
            <th className="px-4 py-2.5 text-right">
              <span className="inline-flex items-center gap-1.5">
                <AssetLogo asset={b} className="size-4 rounded" /> {b.symbol}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, l, r]) => (
            <tr key={k} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2.5 text-muted-foreground">{k}</td>
              <td className="num px-4 py-2.5 text-right">{l}</td>
              <td className="num px-4 py-2.5 text-right">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function DeskNoteCard({ payload }: { payload?: unknown }) {
  const p = payload as
    | { desknote?: { symbol?: string; timeframe?: string; output?: Record<string, unknown> } }
    | { asset?: Asset }
    | undefined;
  const output = p && "desknote" in p ? p.desknote?.output : undefined;
  if (p && "asset" in p && p.asset) {
    return <AssetCard asset={p.asset} />;
  }
  if (!output) {
    return <p className="mt-3 text-xs text-muted-foreground">Desk note unavailable.</p>;
  }
  const bias = String(output["bias"] ?? "neutral");
  const summary = String(output["summary"] ?? "");
  const keyLevels = (output["keyLevels"] ?? {}) as Record<string, number>;
  const momentum = (output["momentum"] ?? {}) as Record<string, unknown>;
  const trend = String(output["trend"] ?? "—");
  const confidence = String(output["confidence"] ?? "—");
  const marketContext = (output["marketContext"] ?? {}) as Record<string, unknown>;
  const disclaimer = String(output["disclaimer"] ?? "");
  const symbol = String(
    p && "desknote" in p ? (p.desknote?.symbol ?? "") : (output["symbol"] ?? ""),
  );
  const timeframe = String(
    p && "desknote" in p ? (p.desknote?.timeframe ?? "") : (output["timeframe"] ?? ""),
  );
  const biasTone =
    bias === "bullish"
      ? "bg-up/10 text-up"
      : bias === "bearish"
        ? "bg-down/10 text-down"
        : "bg-muted text-muted-foreground";

  return (
    <div className="mt-3 panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", biasTone)}>
          {bias}
        </span>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {symbol} · {timeframe}
        </span>
        <span className="text-[11px] text-muted-foreground">confidence: {confidence}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            Key levels
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Support</span>
              <span className="num">${keyLevels["support"] ?? "—"}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Pivot</span>
              <span className="num">${keyLevels["pivot"] ?? "—"}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Resistance</span>
              <span className="num">${keyLevels["resistance"] ?? "—"}</span>
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Momentum</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Trend</span>
              <span>{trend}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">RSI</span>
              <span className="num">{String(momentum["rsi"] ?? "—")}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Stochastic</span>
              <span className="num">{String(momentum["stochastic"] ?? "—")}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Sentiment</span>
              <span>{String(marketContext["sentiment"] ?? "—")}</span>
            </p>
          </div>
        </div>
      </div>
      {disclaimer && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">{disclaimer}</p>
      )}
      <p className="mt-2 text-[11px] text-primary">
        <Link to="/saved" className="hover:underline">
          Saved to your analysis library →
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function renderPayload(m: ChatMessage) {
  switch (m.kind) {
    case "asset":
      return <AssetCard asset={(m.payload as { asset: Asset }).asset} />;
    case "movers":
      return <MoversCard movers={(m.payload as { movers: Asset[] }).movers} />;
    case "global":
      return <GlobalCard global={(m.payload as { global: GlobalStats }).global} />;
    case "fear":
      return <FearCard global={(m.payload as { global: GlobalStats }).global} />;
    case "dominance":
      return <DominanceCard global={(m.payload as { global: GlobalStats }).global} />;
    case "cycle":
      return <CycleCard />;
    case "news":
      return <NewsCard items={(m.payload as { items: FinnhubNewsHeadline[] }).items} />;
    case "compare":
      return <CompareCard {...(m.payload as { a: Asset; b: Asset })} />;
    case "desknote":
      return <DeskNoteCard payload={m.payload} />;
    default:
      return null;
  }
}

function AssistantMessage({ m }: { m: ChatMessage }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Brain className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">{m.text}</p>
        {renderPayload(m)}
      </div>
    </div>
  );
}

function UserMessage({ m }: { m: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {m.text}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Brain className="size-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function Welcome({ onPrompt }: { onPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-6 text-center sm:pt-10">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Brain className="size-7" />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Advanced Chat</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Ask anything about the market — live prices, movers, fear & greed, dominance, the cycle,
        news, or a server-side desk note on any asset.
      </p>
      <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CAPABILITIES.map((c) => (
          <button
            key={c.title}
            type="button"
            onClick={() => onPrompt(c.prompt)}
            className="panel group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
              <c.icon className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">{c.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The chat
// ---------------------------------------------------------------------------

export function AdvancedChat() {
  const assets = useLiveAssets();
  const global = useLiveGlobal();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [messages]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", kind: "fallback", text, createdAt: Date.now() },
    ]);
    setBusy(true);
    try {
      const reply = await respondTo(text, { assets, global });
      setMessages((m) => [...m, { id: uid(), role: "assistant", ...reply, createdAt: Date.now() }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Top bar */}
      <header className="z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Brand subtitle="Advanced Chat" />
            <span className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary sm:inline-flex">
              <Sparkles className="size-3" />
              AI assistant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                <Wrench className="size-3.5" />
                <span className="hidden sm:inline">Tools</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                  Market tools
                </DropdownMenuLabel>
                {marketPages.map((p) => (
                  <DropdownMenuItem key={p.publicTo} asChild>
                    <Link to={p.consoleTo} className="gap-2.5">
                      <p.icon className="size-3.5 text-muted-foreground" />
                      {p.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/chart" className="gap-2.5">
                    <LineChart className="size-3.5 text-muted-foreground" />
                    Advanced Chart
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/news" className="gap-2.5">
                    <Newspaper className="size-3.5 text-muted-foreground" />
                    News
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          {messages.length === 0 && <Welcome onPrompt={(p) => void send(p)} />}

          {messages.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m.id} m={m} />
            ) : (
              <AssistantMessage key={m.id} m={m} />
            ),
          )}

          {busy && <TypingBubble />}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-5xl space-y-2.5 px-4 py-4 sm:px-6">
          {!busy && (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-primary/40">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Ask about any asset, the market, the cycle, news…"
              className="max-h-40 min-h-[46px] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={busy || !input.trim()}
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground/70">
            Rule-based market intelligence from live data — research only, never financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
