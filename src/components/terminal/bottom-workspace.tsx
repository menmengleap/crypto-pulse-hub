import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronUp,
  Gauge,
  LayoutGrid,
  LineChart,
  ListOrdered,
  TimerReset,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { AssetLogo } from "@/components/market/asset-logo";
import { ChangeBadge } from "@/components/market/ui";
import { fmtCompact, fmtPrice, indicators, savedAnalyses, type Asset } from "@/lib/market-data";
import { INDICATOR_PRESETS } from "@/lib/indicators";
import { useLiveAssets } from "@/lib/realtime";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "screener", label: "Screener", icon: LayoutGrid },
  { id: "performance", label: "Performance", icon: LineChart },
  { id: "technicals", label: "Technicals", icon: Gauge },
  { id: "indicators", label: "Indicators", icon: TimerReset },
  { id: "strategy", label: "Strategy", icon: Wand2 },
  { id: "trading", label: "Trading", icon: ListOrdered },
];

type TabId = "screener" | "performance" | "technicals" | "indicators" | "strategy" | "trading";

type SortKey = "symbol" | "price" | "change24h" | "change7d" | "marketCap" | "volume24h";

const TH =
  "px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors";

/**
 * Bottom workspace — a resizable band under the chart with six tool tabs.
 * Height is drag-resizable via the top handle and persists to localStorage.
 */
export function BottomWorkspace({
  activeIndicators,
  onToggleIndicator,
  onSelectSymbol,
}: {
  activeIndicators: string[];
  onToggleIndicator: (k: string) => void;
  onSelectSymbol: (s: string) => void;
}) {
  const workspace = useWorkspace();
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startH: workspace.bottomPanelHeight };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next = dragRef.current.startH + (dragRef.current.startY - e.clientY);
    workspace.setBottomPanelHeight(Math.min(720, Math.max(160, next)));
  };
  const onDragEnd = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="relative flex min-h-0 flex-col border-t border-border bg-surface/50"
      style={{ height: workspace.bottomPanelHeight }}
    >
      {/* Drag handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="group flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-b border-border/50 hover:border-primary/40"
      >
        <span className="h-0.5 w-10 rounded-full bg-border transition-colors group-hover:bg-primary/50" />
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-border px-1.5">
        {TABS.map((t) => {
          const active = workspace.bottomTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => workspace.setBottomTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-md border-b-2 px-2.5 py-1.5 text-[10px] font-medium transition-colors",
                active
                  ? "border-primary bg-surface text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <t.icon className="size-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => workspace.setBottomPanel(false)}
          title="Close panel"
          aria-label="Close bottom panel"
          className="ml-auto grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {workspace.bottomTab === "screener" && <Screener onSelectSymbol={onSelectSymbol} />}
        {workspace.bottomTab === "performance" && <Performance />}
        {workspace.bottomTab === "technicals" && <Technicals />}
        {workspace.bottomTab === "indicators" && (
          <IndicatorList
            activeIndicators={activeIndicators}
            onToggleIndicator={onToggleIndicator}
          />
        )}
        {workspace.bottomTab === "strategy" && <Strategy />}
        {workspace.bottomTab === "trading" && <Trading />}
      </div>

      {/* Reopen affordance when collapsed is handled by the shell */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function Screener({ onSelectSymbol }: { onSelectSymbol: (s: string) => void }) {
  const assets = useLiveAssets();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "marketCap", dir: -1 });

  const rows = [...assets].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * sort.dir;
    return ((av as number) - (bv as number)) * sort.dir;
  });

  const setSortKey = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));

  const SortArrow = ({ k }: { k: SortKey }) => (
    <span className="ml-0.5 inline-block align-middle">
      {sort.key === k ? (
        sort.dir === 1 ? (
          <ArrowUp className="size-2.5" />
        ) : (
          <ArrowDown className="size-2.5" />
        )
      ) : null}
    </span>
  );

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="sticky top-0 bg-surface/95 backdrop-blur">
        <tr className="border-b border-border">
          <th className={TH} onClick={() => setSortKey("symbol")}>
            Asset <SortArrow k="symbol" />
          </th>
          <th className={TH} onClick={() => setSortKey("price")}>
            Price <SortArrow k="price" />
          </th>
          <th className={TH} onClick={() => setSortKey("change24h")}>
            24h <SortArrow k="change24h" />
          </th>
          <th className={TH} onClick={() => setSortKey("change7d")}>
            7d <SortArrow k="change7d" />
          </th>
          <th className={cn(TH, "hidden md:table-cell")} onClick={() => setSortKey("volume24h")}>
            Volume <SortArrow k="volume24h" />
          </th>
          <th className={cn(TH, "hidden lg:table-cell")} onClick={() => setSortKey("marketCap")}>
            Market Cap <SortArrow k="marketCap" />
          </th>
          <th className={cn(TH, "hidden xl:table-cell")}>Trend</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr
            key={a.id}
            onClick={() => onSelectSymbol(a.symbol)}
            className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent/40"
          >
            <td className="px-2 py-1.5">
              <span className="flex items-center gap-2">
                <AssetLogo asset={a} className="size-4 rounded" />
                <span className="font-semibold text-foreground">{a.symbol}</span>
                <span className="hidden text-muted-foreground sm:inline">{a.name}</span>
              </span>
            </td>
            <td className="px-2 py-1.5 tabular-nums text-foreground">{fmtPrice(a.price)}</td>
            <td className="px-2 py-1.5">
              <ChangeBadge value={a.change24h} />
            </td>
            <td className="px-2 py-1.5">
              <ChangeBadge value={a.change7d} />
            </td>
            <td className="hidden px-2 py-1.5 tabular-nums text-muted-foreground md:table-cell">
              {fmtCompact(a.volume24h)}
            </td>
            <td className="hidden px-2 py-1.5 tabular-nums text-muted-foreground lg:table-cell">
              {fmtCompact(a.marketCap)}
            </td>
            <td className="hidden px-2 py-1.5 text-muted-foreground xl:table-cell">{a.trend}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Performance() {
  const assets = useLiveAssets();
  const by24 = [...assets].sort((a, b) => b.change24h - a.change24h).slice(0, 8);
  const by7 = [...assets].sort((a, b) => b.change7d - a.change7d).slice(0, 8);
  return (
    <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
      <PerfCard title="Top movers — 24h" rows={by24} />
      <PerfCard title="Top movers — 7d" rows={by7} />
    </div>
  );
}

function PerfCard({ title, rows }: { title: string; rows: Asset[] }) {
  return (
    <div className="rounded-md border border-border bg-surface/40">
      <p className="border-b border-border px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {rows.map((a, i) => (
        <div
          key={a.id}
          className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 text-[11px] last:border-0"
        >
          <span className="w-4 text-right tabular-nums text-muted-foreground">{i + 1}</span>
          <AssetLogo asset={a} className="size-4 rounded" />
          <span className="w-14 font-semibold text-foreground">{a.symbol}</span>
          <span className="ml-auto tabular-nums text-foreground">{fmtPrice(a.price)}</span>
          <span className="w-16 text-right">
            <ChangeBadge value={a.change24h} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Technicals() {
  return (
    <div className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map((ind) => (
        <div
          key={ind.name}
          className="flex items-center gap-3 rounded-md border border-border bg-surface/40 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {ind.name}
            </p>
            <p className="truncate text-[11px] font-medium text-foreground">{ind.signal}</p>
          </div>
          <p className="text-right">
            <span className="block text-[12px] font-semibold tabular-nums text-foreground">
              {ind.value}
            </span>
            <span
              className={cn(
                "text-[9px] font-medium",
                ind.tone === "up"
                  ? "text-up"
                  : ind.tone === "down"
                    ? "text-down"
                    : "text-muted-foreground",
              )}
            >
              {ind.tone === "up" ? "Bullish" : ind.tone === "down" ? "Bearish" : "Neutral"}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

function IndicatorList({
  activeIndicators,
  onToggleIndicator,
}: {
  activeIndicators: string[];
  onToggleIndicator: (k: string) => void;
}) {
  return (
    <div className="p-3">
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        Applied to chart — toggle to add or remove
      </p>
      <div className="flex flex-wrap gap-1.5">
        {INDICATOR_PRESETS.map((p) => {
          const on = activeIndicators.includes(p.key);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onToggleIndicator(p.key)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                on
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface/40 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: Object.values(p.colors).find((c) => c) ?? "#9AA1AA" }}
              />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Strategy() {
  return (
    <div className="p-3">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {savedAnalyses.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-md border border-border bg-surface/40 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-foreground">{s.title}</p>
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {s.asset} · {s.timeframe} · {s.date}
              </p>
            </div>
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                s.tag === "Bullish"
                  ? "border-up/25 bg-up/10 text-up"
                  : s.tag === "Bearish"
                    ? "border-down/25 bg-down/10 text-down"
                    : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {s.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trading() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  return (
    <div className="flex items-start gap-4 p-3">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface/40 p-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Order ticket
        </p>
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setSide("buy")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
              side === "buy" ? "bg-up/15 text-up" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide("sell")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
              side === "sell"
                ? "bg-down/15 text-down"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Sell
          </button>
        </div>
        <input
          placeholder="Amount"
          className="mb-2 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
        <input
          placeholder="Price (limit)"
          className="mb-3 h-8 w-full rounded-md border border-border bg-surface px-2.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
        <button
          type="button"
          className={cn(
            "w-full rounded-md py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90",
            side === "buy" ? "bg-up" : "bg-down",
          )}
        >
          {side === "buy" ? "Buy / Long" : "Sell / Short"}
        </button>
        <p className="mt-2 text-center text-[9px] text-muted-foreground">
          Paper trading demo — no orders are executed.
        </p>
      </div>
    </div>
  );
}
