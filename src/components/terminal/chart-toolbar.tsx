import { useState } from "react";
import { alerts } from "@/lib/market-data";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Check,
  ChevronDown,
  Eraser,
  Expand,
  GitCompareArrows,
  Maximize2,
  Minimize2,
  PanelLeft,
  Pause,
  PenLine,
  Play,
  Settings2,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { ChangeBadge } from "@/components/market/ui";
import { fmtCompact, fmtPrice, timeframes, type Asset } from "@/lib/market-data";
import { INDICATOR_PRESETS, presetByKey } from "@/lib/indicators";
import { useLiveAssets, useMarketStatus } from "@/lib/realtime";
import { useWorkspace } from "@/lib/workspace";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChartStyle } from "@/components/chart/price-chart";
import type { DrawingToolId } from "@/lib/chart-drawings";

const toolBtn =
  "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const toolBtnActive = "bg-primary/12 text-primary hover:bg-primary/12 hover:text-primary";

const UP_SWATCHES = ["#16C784", "#4C8DF6", "#F7931A", "#B18CFF", "#E8EDF3"];
const DOWN_SWATCHES = ["#EA3943", "#F0616D", "#FF7BC4", "#F0B90B", "#9AA1AA"];

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
      <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className={cn(
              "size-5 rounded border transition-transform hover:scale-110",
              value.toLowerCase() === c.toLowerCase()
                ? "border-foreground ring-1 ring-foreground/30"
                : "border-border",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ChartToolbar({
  asset,
  symbol,
  onSymbol,
  tf,
  onTf,
  chartType,
  onChartType,
  upColor,
  onUpColor,
  downColor,
  onDownColor,
  activeIndicators,
  onToggleIndicator,
  onClearIndicators,
  activeTool,
  onActiveTool,
  drawings,
  onClearDrawings,
  paused,
  onTogglePaused,
}: {
  asset: Asset;
  symbol: string;
  onSymbol: (s: string) => void;
  tf: string;
  onTf: (t: string) => void;
  chartType: ChartStyle;
  onChartType: (c: ChartStyle) => void;
  upColor: string;
  onUpColor: (c: string) => void;
  downColor: string;
  onDownColor: (c: string) => void;
  activeIndicators: string[];
  onToggleIndicator: (k: string) => void;
  onClearIndicators: () => void;
  activeTool: DrawingToolId | null;
  onActiveTool: (t: DrawingToolId | null) => void;
  drawings: unknown[];
  onClearDrawings: () => void;
  paused: boolean;
  onTogglePaused: () => void;
}) {
  const assets = useLiveAssets();
  const status = useMarketStatus();
  const workspace = useWorkspace();
  const drawingActive = activeTool !== null && activeTool !== "pointer";

  return (
    <div className="shrink-0 border-b border-border bg-surface/40">
      {/* Row 1 — symbol, price, timeframes */}
      <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Select value={symbol} onValueChange={onSymbol}>
            <SelectTrigger className="h-7 w-[132px] rounded-md border-border bg-surface text-xs">
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
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <p className="num text-base font-semibold leading-none tracking-tight">
              {fmtPrice(asset.price)}
            </p>
            <ChangeBadge value={asset.change24h} />
          </div>
          <span
            className={cn(
              "hidden items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider lg:inline-flex",
              status === "live"
                ? "border-up/25 bg-up/10 text-up"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            <span className={cn("relative flex size-1", status !== "live" && "opacity-40")}>
              <span
                className={cn(
                  "relative inline-flex size-1 rounded-full",
                  status === "live" ? "bg-up" : "bg-muted-foreground",
                )}
              />
            </span>
            {status === "live" ? "Live" : "Connecting"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {timeframes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTf(t)}
              className={cn(
                "h-7 rounded px-2 text-[11px] font-medium transition-colors",
                tf === t
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 — tools */}
      <div className="flex flex-wrap items-center gap-0.5 border-t border-border px-2 py-1">
        {/* Indicators */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(toolBtn, activeIndicators.length > 0 && toolBtnActive)}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden xl:inline">Indicators</span>
              {activeIndicators.length > 0 && (
                <span className="rounded-full bg-primary/20 px-1.5 text-[9px] font-semibold text-primary">
                  {activeIndicators.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-1">
            <DropdownMenuLabel className="px-2 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Indicators
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["overlay", "pane"] as const).map((kind) => {
              const group = INDICATOR_PRESETS.filter((p) => p.kind === kind);
              if (group.length === 0) return null;
              return (
                <div key={kind}>
                  <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {kind === "overlay" ? "Overlays" : "Panes"}
                  </DropdownMenuLabel>
                  {group.map((p) => {
                    const on = activeIndicators.includes(p.key);
                    return (
                      <DropdownMenuItem
                        key={p.key}
                        onClick={() => onToggleIndicator(p.key)}
                        className={cn("justify-between", on && "bg-primary/12 text-primary")}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {on ? (
                            <Check className="size-3.5 shrink-0" />
                          ) : (
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{
                                background: Object.values(p.colors).find((c) => c) ?? "#9AA1AA",
                              }}
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
                <DropdownMenuItem onClick={onClearIndicators}>
                  <Eraser />
                  Clear all indicators
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Compare — homepage public page */}
        <Tip label="Compare assets (homepage)">
          <Link to="/markets/compare" className={cn(toolBtn, "gap-1")}>
            <GitCompareArrows className="size-3.5" />
            <span className="hidden xl:inline">Compare</span>
          </Link>
        </Tip>

        {/* Drawing tools */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(toolBtn, drawingActive && toolBtnActive, drawingActive && "relative")}
            >
              <PenLine className="size-3.5" />
              <span className="hidden xl:inline">Drawing</span>
              {drawingActive && (
                <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 p-1">
            <DropdownMenuLabel className="px-2 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Drawings
            </DropdownMenuLabel>
            {DRAW_TOOLS.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => onActiveTool(t.id)}
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
                <DropdownMenuItem onClick={onClearDrawings}>
                  <Eraser />
                  Clear all drawings
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Alerts */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={toolBtn}>
              <Bell className="size-3.5" />
              <span className="hidden xl:inline">Alert</span>
              {alerts.filter((a) => a.status === "Active").length > 0 && (
                <span className="rounded-full bg-primary/20 px-1.5 text-[9px] font-semibold text-primary">
                  {alerts.filter((a) => a.status === "Active").length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="px-3 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Price alerts
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto px-1 py-1">
              {alerts.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  className="flex items-center justify-between gap-2 px-2 py-2"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold text-foreground">
                      {a.asset} · {a.condition} {a.target}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{a.created}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      a.status === "Active"
                        ? "border-up/25 bg-up/10 text-up"
                        : a.status === "Paused"
                          ? "border-border bg-muted/40 text-muted-foreground"
                          : "border-down/25 bg-down/10 text-down",
                    )}
                  >
                    {a.status}
                  </span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Replay / pause live */}
        <Tip label={paused ? "Resume live" : "Pause live"}>
          <button
            type="button"
            onClick={onTogglePaused}
            className={cn(toolBtn, paused && toolBtnActive)}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            <span className="hidden xl:inline">{paused ? "Resume" : "Replay"}</span>
          </button>
        </Tip>

        {/* Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={toolBtn}>
              <Settings2 className="size-3.5" />
              <span className="hidden xl:inline">Settings</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60 p-0">
            <DropdownMenuLabel className="px-3 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Chart style
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={chartType}
              onValueChange={(v) => onChartType(v as ChartStyle)}
            >
              <DropdownMenuRadioItem value="candles">Candles</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="line">Line</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="area">Area</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <div className="space-y-3 p-3">
              <SwatchRow
                label="Up color"
                value={upColor}
                onChange={onUpColor}
                swatches={UP_SWATCHES}
              />
              <SwatchRow
                label="Down color"
                value={downColor}
                onChange={onDownColor}
                swatches={DOWN_SWATCHES}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Left drawing rail toggle */}
        <Tip label={workspace.leftToolbar ? "Hide drawing rail" : "Show drawing rail"}>
          <button
            type="button"
            onClick={() => workspace.setLeftToolbar(!workspace.leftToolbar)}
            className={cn(toolBtn, workspace.leftToolbar && toolBtnActive)}
          >
            <PanelLeft className="size-3.5" />
          </button>
        </Tip>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* Fullscreen (browser) */}
        <Tip label={workspace.focusMode ? "Exit focus" : "Focus chart"}>
          <button
            type="button"
            onClick={() => workspace.setFocusMode(!workspace.focusMode)}
            className={cn(toolBtn, workspace.focusMode && toolBtnActive)}
          >
            {workspace.focusMode ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </button>
        </Tip>

        {/* Right panel toggle */}
        <Tip label={workspace.rightPanel ? "Close AI panel" : "Open AI panel"}>
          <button
            type="button"
            onClick={() => workspace.setRightPanel(!workspace.rightPanel)}
            className={cn(toolBtn, workspace.rightPanel && toolBtnActive)}
          >
            <Expand className="size-3.5" />
            <span className="hidden xl:inline">AI</span>
          </button>
        </Tip>

        {/* Bottom panel toggle */}
        <Tip label={workspace.bottomPanel ? "Close bottom panel" : "Open bottom panel"}>
          <button
            type="button"
            onClick={() => workspace.setBottomPanel(!workspace.bottomPanel)}
            className={cn(toolBtn, workspace.bottomPanel && toolBtnActive)}
          >
            {workspace.bottomPanel ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <Expand className="size-3.5" />
            )}
            <span className="hidden xl:inline">Panel</span>
          </button>
        </Tip>
      </div>
    </div>
  );
}

const DRAW_TOOLS: { id: DrawingToolId; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "pointer", label: "Pointer", icon: Expand, hint: "Esc" },
  { id: "trend", label: "Trend line", icon: PenLine, hint: "T" },
  { id: "horizontal", label: "Horizontal line", icon: SlidersHorizontal, hint: "H" },
  { id: "vertical", label: "Vertical line", icon: X, hint: "V" },
  { id: "ray", label: "Ray", icon: GitCompareArrows, hint: "R" },
  { id: "rectangle", label: "Rectangle", icon: Settings2, hint: "B" },
  { id: "fib", label: "Fibonacci", icon: GitCompareArrows, hint: "F" },
];
