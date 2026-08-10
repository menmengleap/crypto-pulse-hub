import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpDown,
  Brain,
  Check,
  Crosshair,
  Eraser,
  Expand,
  GitCompareArrows,
  LineChart,
  Minus,
  MousePointer2,
  MoveUpRight,
  PenLine,
  Percent,
  Settings2,
  SlidersHorizontal,
  Square,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PriceChart, type ChartStyle } from "@/components/chart/price-chart";
import { Panel, IndicatorCard, ChangeBadge } from "@/components/market/ui";
import { indicators, timeframes, fmtCompact, fmtPrice } from "@/lib/market-data";
import { INDICATOR_PRESETS, presetByKey } from "@/lib/indicators";
import { useLiveAssets, useMarketStatus } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChartDrawing, DrawingToolId } from "@/lib/chart-drawings";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Advanced Chart — Cryptolytic" },
      {
        name: "description",
        content:
          "Advanced candlestick charting with volume, indicators, market structure and AI-assisted analysis.",
      },
      { property: "og:title", content: "Advanced Chart — Cryptolytic" },
      {
        property: "og:description",
        content: "Candles, volume, indicators and structure in one analyst workspace.",
      },
    ],
  }),
  component: ChartPage,
});

const toolBtn =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const toolBtnActive = "bg-primary/12 text-primary hover:bg-primary/12 hover:text-primary";

const drawingTools: { id: DrawingToolId; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "pointer", label: "Pointer", icon: MousePointer2, hint: "Esc" },
  { id: "trend", label: "Trend line", icon: TrendingUp, hint: "T" },
  { id: "horizontal", label: "Horizontal line", icon: Minus, hint: "H" },
  { id: "vertical", label: "Vertical line", icon: ArrowUpDown, hint: "V" },
  { id: "ray", label: "Ray", icon: MoveUpRight, hint: "R" },
  { id: "rectangle", label: "Rectangle", icon: Square, hint: "B" },
  { id: "fib", label: "Fibonacci", icon: Percent, hint: "F" },
];

const UP_SWATCHES = ["#2ED3A0", "#4C8DF6", "#F7931A", "#B18CFF", "#FFFFFF"];
const DOWN_SWATCHES = ["#F0616D", "#E84142", "#FF7BC4", "#F0B90B", "#9AA1AA"];

function SwatchRow({
  value,
  onChange,
  swatches,
  label,
}: {
  value: string;
  onChange: (c: string) => void;
  swatches: string[];
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className={cn(
              "size-6 rounded-md border transition-transform hover:scale-110",
              value.toLowerCase() === c.toLowerCase()
                ? "border-foreground ring-2 ring-foreground/30"
                : "border-border",
            )}
            style={{ background: c }}
          />
        ))}
        <label className="relative ml-1 grid size-6 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-border transition-colors hover:border-foreground">
          <span className="text-[10px] font-bold text-muted-foreground">+</span>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`Custom ${label}`}
          />
        </label>
      </div>
    </div>
  );
}

function ChartPage() {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState("BTC");
  const [tf, setTf] = useState<string>("4H");
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingToolId | null>(null);
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [chartType, setChartType] = useState<ChartStyle>("candles");
  const [upColor, setUpColor] = useState("#2ED3A0");
  const [downColor, setDownColor] = useState("#F0616D");
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const assets = useLiveAssets();
  const status = useMarketStatus();
  const asset = assets.find((a) => a.symbol === symbol) ?? assets[0]!;

  const drawingActive = activeTool !== null && activeTool !== "pointer";

  const toggleIndicator = (key: string) =>
    setActiveIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  // Keyboard shortcuts for the drawing tools (matches the dropdown hints).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      if (e.key === "Escape") {
        setActiveTool(null);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, DrawingToolId> = {
        t: "trend",
        h: "horizontal",
        v: "vertical",
        r: "ray",
        b: "rectangle",
        f: "fib",
      };
      const next = map[e.key.toLowerCase()];
      if (next) {
        e.preventDefault();
        setActiveTool(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AppShell title="Advanced Chart" subtitle={`${asset.pair} · ${tf}`}>
      <div className="space-y-5">
        <Panel bodyClassName="p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-4">
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="h-9 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.symbol}>
                      {a.pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="min-w-0">
                <p className="num text-2xl font-semibold tracking-tight">{fmtPrice(asset.price)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ChangeBadge value={asset.change24h} />
                  <span className="text-xs text-muted-foreground">
                    24h vol {fmtCompact(asset.volume24h)}
                  </span>
                </div>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs",
                status === "live"
                  ? "border-up/25 bg-up/10 text-up"
                  : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <span className={cn("relative flex size-1.5", status !== "live" && "opacity-40")}>
                {status === "live" && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-60" />
                )}
                <span
                  className={cn(
                    "relative inline-flex size-1.5 rounded-full",
                    status === "live" ? "bg-up" : "bg-muted-foreground",
                  )}
                />
              </span>
              {status === "live" ? "Live" : status === "offline" ? "Reconnecting" : "Connecting"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="flex flex-wrap gap-1">
              {timeframes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs transition-colors",
                    tf === t
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <div className="flex flex-wrap items-center gap-1">
              {/* Indicators — computed by the Python microservice */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(toolBtn, activeIndicators.length > 0 && toolBtnActive)}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span className="hidden sm:inline">Indicators</span>
                    {activeIndicators.length > 0 && (
                      <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
                        {activeIndicators.length}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1">
                  <DropdownMenuLabel className="flex items-center justify-between px-2 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Indicators
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
                      live from service
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(["overlay", "pane"] as const).map((kind) => {
                    const group = INDICATOR_PRESETS.filter((p) => p.kind === kind);
                    if (group.length === 0) return null;
                    return (
                      <div key={kind}>
                        <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {kind === "overlay" ? "Overlays" : "Panes"}
                        </DropdownMenuLabel>
                        {group.map((p) => {
                          const on = activeIndicators.includes(p.key);
                          const dot = Object.values(p.colors).find((c) => c) ?? "#9AA1AA";
                          return (
                            <DropdownMenuItem
                              key={p.key}
                              onClick={() => toggleIndicator(p.key)}
                              className={cn("justify-between", on && "bg-primary/12 text-primary")}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {on ? (
                                  <Check className="size-3.5 shrink-0" />
                                ) : (
                                  <span
                                    className="size-1.5 shrink-0 rounded-full"
                                    style={{ background: dot }}
                                  />
                                )}
                                <span className="truncate">{p.label}</span>
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                      </div>
                    );
                  })}
                  {activeIndicators.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setActiveIndicators([])}>
                        <Eraser />
                        Clear all indicators
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Compare — navigates to the Compare page */}
              <button
                type="button"
                onClick={() => navigate({ to: "/compare" })}
                className={toolBtn}
              >
                <GitCompareArrows className="size-3.5" />
                <span className="hidden sm:inline">Compare</span>
              </button>

              {/* Drawing — dropdown of drawing tools */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      toolBtn,
                      drawingActive && toolBtnActive,
                      drawingActive && "relative",
                    )}
                  >
                    <PenLine className="size-3.5" />
                    <span className="hidden sm:inline">Drawing</span>
                    {drawingActive && (
                      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1">
                  <DropdownMenuLabel className="px-2 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Drawings
                  </DropdownMenuLabel>
                  {drawingTools.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className={cn(activeTool === t.id && "bg-primary/12 text-primary")}
                    >
                      <t.icon />
                      <span>{t.label}</span>
                      <DropdownMenuShortcut>{t.hint}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ))}
                  {drawings.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDrawings([])}>
                        <Eraser />
                        Clear all drawings
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings — style, candle colors, chart type */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={toolBtn}>
                    <Settings2 className="size-3.5" />
                    <span className="hidden sm:inline">Settings</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-0">
                  <DropdownMenuLabel className="px-3 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Chart style
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={chartType}
                    onValueChange={(v) => setChartType(v as ChartStyle)}
                  >
                    <DropdownMenuRadioItem value="candles" className="pl-8">
                      Candles
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="line" className="pl-8">
                      Line
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="area" className="pl-8">
                      Area
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <div className="space-y-3 p-3">
                    <SwatchRow
                      label="Up color"
                      value={upColor}
                      onChange={setUpColor}
                      swatches={UP_SWATCHES}
                    />
                    <SwatchRow
                      label="Down color"
                      value={downColor}
                      onChange={setDownColor}
                      swatches={DOWN_SWATCHES}
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                className={cn(toolBtn, fullscreen && toolBtnActive)}
              >
                <Expand className="size-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          </div>

          {activeIndicators.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
              <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Active
              </span>
              {activeIndicators.map((key) => {
                const p = presetByKey(key);
                if (!p) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleIndicator(key)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        p.kind === "overlay" ? "bg-[#F7931A]" : "bg-[#B18CFF]",
                      )}
                    />
                    {p.label}
                    <X className="size-3 opacity-40 transition-opacity group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-2 sm:p-3">
            <PriceChart
              symbol={symbol}
              tf={tf}
              height={fullscreen ? 720 : 460}
              chartType={chartType}
              upColor={upColor}
              downColor={downColor}
              activeTool={activeTool}
              drawings={drawings}
              onDrawingsChange={setDrawings}
              indicators={activeIndicators}
            />
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Technical Analysis"
            description={`${asset.pair} · ${tf}`}
            className="lg:col-span-2"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {indicators.map((i) => (
                <IndicatorCard key={i.name} {...i} />
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel title="Market Structure">
              <dl className="space-y-3 text-sm">
                {[
                  ["Structure", "Higher High / Higher Low"],
                  ["Trend", asset.trend],
                  ["Momentum", asset.momentum],
                  ["Volatility", "Expanding"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <dt className="truncate text-muted-foreground">{k}</dt>
                    <dd className="truncate font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Support & Resistance">
              <div className="space-y-3">
                {[
                  ["Resistance 2", "$124,800", "down"],
                  ["Resistance 1", "$120,200", "down"],
                  ["Support 1", "$116,400", "up"],
                  ["Support 2", "$112,100", "up"],
                ].map(([label, value, tone]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="truncate text-xs text-muted-foreground">{label}</span>
                    <span
                      className={cn(
                        "num text-sm font-medium",
                        tone === "up" ? "text-up" : "text-down",
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="AI Analysis" description="Generated from current chart">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Brain className="size-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Price holds above the 20 and 50 EMA with an intact higher-low sequence. Momentum
                  is strong but stochastic is approaching overbought — continuation favours a retest
                  of {"$"}120,200 while {"$"}116,400 remains the invalidation shelf.
                </p>
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Momentum">
            <div className="space-y-3">
              {[
                ["RSI (14)", asset.rsi, 100],
                ["Stochastic", 78.4, 100],
                ["MFI", 62.1, 100],
              ].map(([label, v, max]) => (
                <div key={label as string}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{label}</span>
                    <span className="num">{(v as number).toFixed(1)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${((v as number) / (max as number)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Volume profile">
            <dl className="space-y-3 text-sm">
              {[
                ["24h volume", fmtCompact(asset.volume24h)],
                ["Volume vs 30d avg", "+18.4%"],
                ["Point of control", "$117,900"],
                ["Value area", "$114.2k – $120.6k"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <dt className="truncate text-muted-foreground">{k}</dt>
                  <dd className="num truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Session context">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-btc/12 text-btc">
                <Crosshair className="size-4" />
              </span>
              <p className="text-sm text-muted-foreground">
                Asian session drove the initial expansion, US session confirmed with above-average
                participation. No significant liquidation cluster until {"$"}112k.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LineChart className="size-3.5" /> Live candles streamed from Binance in real time.
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
