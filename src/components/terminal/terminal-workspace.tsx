import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Maximize2, MessageSquare, PanelBottom, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdvancedChat } from "@/components/chat/advanced-chat";
import { PriceChart, type ChartStyle } from "@/components/chart/price-chart";
import type { ChartDrawing, DrawingToolId } from "@/lib/chart-drawings";
import { bySymbol } from "@/lib/market-data";
import { initRealtime } from "@/lib/realtime";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { AIPanel } from "@/components/terminal/ai-panel";
import { AlertsPopover } from "@/components/terminal/alerts-popover";
import { BottomWorkspace } from "@/components/terminal/bottom-workspace";
import { ChartToolbar } from "@/components/terminal/chart-toolbar";
import { DrawingToolbar } from "@/components/terminal/drawing-toolbar";
import { MarketTicker } from "@/components/terminal/market-ticker";
import { TopNav } from "@/components/terminal/top-nav";

/**
 * Cryptolytic Professional AI Trading Terminal.
 *
 * 100vw × 100vh app workspace:
 *
 *   [ TopNav ]            (hidden in focus mode)
 *   [ MarketTicker ]      (hidden in focus mode)
 *   [ Left rail | chart + toolbar | right AI panel ]   ← flex row; panels
 *   [ Bottom workspace ]                               ← removable columns/rows
 *
 * Every panel toggles independently from the workspace store (persisted to
 * localStorage as `cryptolytic_workspace`). The chart column is `flex-1`, so
 * when the right + bottom panels are closed the chart expands to claim the
 * full viewport — no reserved space is ever left behind.
 */
export function TerminalWorkspace() {
  const workspace = useWorkspace();

  // Chart state
  const [symbol, setSymbol] = useState("BTC");
  const [tf, setTf] = useState("4H");
  const [chartType, setChartType] = useState<ChartStyle>("candles");
  const [upColor, setUpColor] = useState("#2ED3A0");
  const [downColor, setDownColor] = useState("#F0616D");
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["sma20", "rsi14"]);
  const [activeTool, setActiveTool] = useState<DrawingToolId | null>(null);
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [paused, setPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const asset = bySymbol(symbol)!;
  const isMobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initRealtime();
  }, []);

  const toggleIndicator = (k: string) =>
    setActiveIndicators((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void rootRef.current?.requestFullscreen?.();
    }
  };

  // Esc cancels the active drawing tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTool(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectSymbol = (s: string) => {
    setSymbol(s);
    setActiveTool(null);
  };

  return (
    <div
      ref={rootRef}
      className="terminal-scope flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground"
    >
      {/* Top chrome — hidden in focus mode so the chart owns the viewport */}
      {!workspace.focusMode && (
        <>
          <TopNav
            symbol={symbol}
            onSelectSymbol={selectSymbol}
            onOpenChat={() => setChatOpen(true)}
          />
          <MarketTicker symbol={symbol} onSelect={selectSymbol} />
        </>
      )}

      {/* Main workspace row — flex so closed panels truly remove their column */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left drawing rail */}
        {workspace.leftToolbar && (
          <DrawingToolbar
            activeTool={activeTool}
            onActiveTool={setActiveTool}
            drawings={drawings}
            onClearDrawings={() => setDrawings([])}
          />
        )}

        {/* Left rail reopen handle when collapsed */}
        {!workspace.leftToolbar && (
          <button
            type="button"
            onClick={() => workspace.setLeftToolbar(true)}
            title="Open drawing tools"
            aria-label="Open drawing tools"
            className="absolute left-0 top-1/2 z-20 flex h-16 w-1.5 -translate-y-1/2 items-center justify-center rounded-r bg-surface text-muted-foreground shadow transition-all hover:w-3.5 hover:bg-primary hover:text-background"
          >
            <ChevronLeft className="size-3" />
          </button>
        )}

        {/* Chart column — flex-1 so it always takes the remaining width */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChartToolbar
            asset={asset}
            symbol={symbol}
            onSymbol={selectSymbol}
            tf={tf}
            onTf={setTf}
            chartType={chartType}
            onChartType={setChartType}
            upColor={upColor}
            onUpColor={setUpColor}
            downColor={downColor}
            onDownColor={setDownColor}
            activeIndicators={activeIndicators}
            onToggleIndicator={toggleIndicator}
            onClearIndicators={() => setActiveIndicators([])}
            activeTool={activeTool}
            onActiveTool={setActiveTool}
            drawings={drawings}
            onClearDrawings={() => setDrawings([])}
            paused={paused}
            onTogglePaused={() => setPaused((p) => !p)}
          />
          <div className="relative min-h-0 min-w-0 flex-1">
            <PriceChart
              symbol={symbol}
              tf={tf}
              fill
              streaming={!paused}
              chartType={chartType}
              upColor={upColor}
              downColor={downColor}
              activeTool={activeTool}
              drawings={drawings}
              onDrawingsChange={setDrawings}
              indicators={activeIndicators}
            />
            {/* Right panel reopen handle — a thin edge tab when closed */}
            {!workspace.rightPanel && (
              <button
                type="button"
                onClick={() => workspace.setRightPanel(true)}
                title="Open AI panel"
                aria-label="Open AI panel"
                className="absolute right-0 top-1/2 z-20 flex h-16 w-1.5 -translate-y-1/2 items-center justify-center rounded-l bg-surface text-muted-foreground shadow transition-all hover:w-3.5 hover:bg-primary hover:text-background"
              >
                <ChevronLeft className="size-3 -scale-x-100" />
              </button>
            )}
          </div>
        </div>

        {/* Right AI panel — a real column on desktop, a drawer overlay on mobile */}
        {workspace.rightPanel && (
          <>
            {isMobile && (
              <div
                className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm"
                onClick={() => workspace.setRightPanel(false)}
              />
            )}
            <aside
              className={cn(
                "flex min-h-0 flex-col border-l border-border",
                isMobile
                  ? "absolute inset-y-0 right-0 z-30 w-[85vw] max-w-[340px] bg-surface/95 shadow-2xl backdrop-blur"
                  : "w-auto bg-surface/60",
              )}
              style={isMobile ? undefined : { width: workspace.rightPanelWidth }}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Analysis
                </p>
                <button
                  type="button"
                  onClick={() => workspace.setRightPanel(false)}
                  title="Close AI panel"
                  aria-label="Close AI panel"
                  className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <AIPanel asset={asset} />
              </div>
              <div className="flex items-center justify-between border-t border-border bg-surface/60 px-2 py-1">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Fullscreen"
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Maximize2 className="size-3" /> Fullscreen
                </button>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Bottom workspace + reopen handle */}
      {workspace.bottomPanel ? (
        <BottomWorkspace
          activeIndicators={activeIndicators}
          onToggleIndicator={toggleIndicator}
          onSelectSymbol={selectSymbol}
        />
      ) : (
        <button
          type="button"
          onClick={() => workspace.setBottomPanel(true)}
          className="group flex h-5 shrink-0 items-center justify-center gap-1.5 border-t border-border bg-surface/60 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelBottom className="size-3 transition-transform group-hover:-translate-y-0.5" />
          Open workspace
        </button>
      )}

      {/* Focus-mode floating controls */}
      {workspace.focusMode && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            title="Open AI research chat"
            className="pointer-events-auto grid size-8 place-items-center rounded-md border border-border bg-surface text-muted-foreground shadow-lg transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <MessageSquare className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => workspace.setFocusMode(false)}
            title="Exit focus mode"
            className="pointer-events-auto grid size-8 place-items-center rounded-md border border-border bg-surface text-muted-foreground shadow-lg transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      )}

      {/* AI research chat — optional overlay, never the primary workspace */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
          <div className="relative mx-auto my-3 flex h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-surface/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                AI Research Chat
              </p>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                title="Close chat"
                aria-label="Close chat"
                className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden [&>div]:h-full">
              <AdvancedChat />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
