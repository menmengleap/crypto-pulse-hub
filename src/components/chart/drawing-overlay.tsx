import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { IChartApi, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";
import {
  FIB_LEVELS,
  type ChartDrawing,
  type DrawingPoint,
  type DrawingToolId,
} from "@/lib/chart-drawings";
import type { AnySeries } from "@/components/chart/price-chart";

const STROKE = "#2ED3A0";
const DRAFT_STROKE = "rgba(46,211,160,0.75)";

type PaneRect = { width: number; height: number };

function getPaneRect(chart: IChartApi): PaneRect {
  const width = chart.timeScale().width();
  const height = chart.panes()[0]?.getHeight() ?? 0;
  return { width, height };
}

const toY = (series: AnySeries, price: number) => series.priceToCoordinate(price);
const toPrice = (series: AnySeries, y: number) => series.coordinateToPrice(y);

function FibShape({
  chart,
  series,
  a,
  b,
}: {
  chart: IChartApi;
  series: AnySeries;
  a: DrawingPoint;
  b: DrawingPoint;
}) {
  const x1 = chart.timeScale().timeToCoordinate(a.time as Time);
  const x2 = chart.timeScale().timeToCoordinate(b.time as Time);
  const y1 = toY(series, a.price);
  if (x1 == null || x2 == null || y1 == null) return null;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const lo = Math.min(a.price, b.price);
  const hi = Math.max(a.price, b.price);
  return (
    <g>
      {FIB_LEVELS.map((lvl, i) => {
        const price = a.price + (b.price - a.price) * lvl;
        const y = toY(series, price);
        if (y == null) return null;
        const next = FIB_LEVELS[i + 1];
        const nextPrice = next != null ? a.price + (b.price - a.price) * next : null;
        const yNext = nextPrice != null ? toY(series, nextPrice) : null;
        return (
          <g key={lvl}>
            {yNext != null && (
              <rect
                x={minX}
                y={Math.min(y, yNext)}
                width={Math.max(0, maxX - minX)}
                height={Math.abs(yNext - y)}
                fill={i % 2 === 0 ? "rgba(46,211,160,0.05)" : "rgba(46,211,160,0.11)"}
              />
            )}
            <line
              x1={minX}
              x2={maxX}
              y1={y}
              y2={y}
              stroke={STROKE}
              strokeOpacity={0.7}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text x={minX + 4} y={y - 3} fill={STROKE} fontSize={9} className="select-none">
              {lvl === 0 || lvl === 1
                ? lvl.toFixed(0)
                : `${lvl.toFixed(3)} · $${price.toLocaleString("en-US", { maximumFractionDigits: price < 1 ? 4 : 2 })}`}
            </text>
          </g>
        );
      })}
      <line
        x1={minX}
        x2={minX}
        y1={toY(series, hi) ?? y1}
        y2={toY(series, lo) ?? y1}
        stroke={STROKE}
        strokeWidth={1}
      />
    </g>
  );
}

function Shape({
  chart,
  series,
  d,
  draft,
}: {
  chart: IChartApi;
  series: AnySeries;
  d: ChartDrawing;
  draft?: boolean;
}) {
  const pane = getPaneRect(chart);
  const stroke = draft ? DRAFT_STROKE : STROKE;
  const dash = draft ? "4 4" : undefined;
  const x1 = chart.timeScale().timeToCoordinate(d.start.time as Time);
  const y1 = toY(series, d.start.price);
  const x2 = chart.timeScale().timeToCoordinate(d.end.time as Time);
  const y2 = toY(series, d.end.price);

  switch (d.tool) {
    case "trend":
      if (x1 == null || x2 == null || y1 == null || y2 == null) return null;
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={draft ? 1 : 1.5}
          strokeDasharray={dash}
        />
      );
    case "horizontal":
      if (x1 == null || y1 == null) return null;
      return (
        <line
          x1={0}
          y1={y1}
          x2={pane.width}
          y2={y1}
          stroke={stroke}
          strokeWidth={draft ? 1 : 1.5}
          strokeDasharray={dash}
        />
      );
    case "vertical":
      if (x1 == null || y1 == null) return null;
      return (
        <line
          x1={x1}
          y1={0}
          x2={x1}
          y2={pane.height}
          stroke={stroke}
          strokeWidth={draft ? 1 : 1.5}
          strokeDasharray={dash}
        />
      );
    case "ray":
      if (x1 == null || x2 == null || y1 == null || y2 == null || x2 === x1) return null;
      {
        const slope = (y2 - y1) / (x2 - x1);
        const yEnd = y1 + slope * (pane.width - x1);
        return (
          <line
            x1={x1}
            y1={y1}
            x2={pane.width}
            y2={yEnd}
            stroke={stroke}
            strokeWidth={draft ? 1 : 1.5}
            strokeDasharray={dash}
          />
        );
      }
    case "rectangle":
      if (x1 == null || x2 == null || y1 == null || y2 == null) return null;
      return (
        <g>
          <rect
            x={Math.min(x1, x2)}
            y={Math.min(y1, y2)}
            width={Math.abs(x2 - x1)}
            height={Math.abs(y2 - y1)}
            fill="rgba(46,211,160,0.08)"
            stroke={stroke}
            strokeWidth={draft ? 1 : 1.2}
            strokeDasharray={dash}
          />
        </g>
      );
    case "fib":
      return <FibShape chart={chart} series={series} a={d.start} b={d.end} />;
  }
}

export function DrawingOverlay({
  chartRef,
  seriesRef,
  activeTool,
  drawings,
  onDrawingsChange,
}: {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<AnySeries | null>;
  activeTool: DrawingToolId | null;
  drawings: ChartDrawing[];
  onDrawingsChange: (d: ChartDrawing[]) => void;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<{ start: DrawingPoint; end: DrawingPoint } | null>(null);
  const [, setTick] = useState(0);
  const drawing = activeTool !== null && activeTool !== "pointer";

  // Redraw when the visible range changes or the pane resizes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const onTick = () => setTick((t) => t + 1);
    chart.timeScale().subscribeVisibleTimeRangeChange(onTick);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && overlayRef.current) {
      ro = new ResizeObserver(onTick);
      ro.observe(overlayRef.current);
    }
    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(onTick);
      ro?.disconnect();
    };
  }, [chartRef]);

  // Escape cancels an in-progress drawing.
  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDraft(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing]);

  const chart = chartRef.current;
  const series = seriesRef.current;
  if (!chart || !series) return null;
  const pane = getPaneRect(chart);

  const toPoint = (e: ReactPointerEvent): DrawingPoint | null => {
    const el = overlayRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = chart.timeScale().coordinateToTime(x);
    const price = toPrice(series, y);
    if (time == null || price == null) return null;
    return { time: time as DrawingPoint["time"], price };
  };

  const commit = (end: DrawingPoint) => {
    if (!drawing || !draft) return;
    onDrawingsChange([
      ...drawings,
      {
        id: crypto.randomUUID(),
        tool: activeTool as ChartDrawing["tool"],
        start: draft.start,
        end,
      },
    ]);
    setDraft(null);
  };

  return (
    <div
      ref={overlayRef}
      className={cn(
        "absolute left-0 top-0 z-10",
        drawing ? "cursor-crosshair" : "pointer-events-none",
      )}
      style={{ width: pane.width, height: pane.height }}
      onPointerDown={(e) => {
        if (!drawing) return;
        const p = toPoint(e);
        if (!p) return;
        setDraft({ start: p, end: p });
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drawing || !draft) return;
        const p = toPoint(e);
        if (p) setDraft((d) => (d ? { ...d, end: p } : d));
      }}
      onPointerUp={(e) => {
        if (!drawing || !draft) return;
        const p = toPoint(e);
        commit(p ?? draft.end);
      }}
      onPointerCancel={() => setDraft(null)}
    >
      <svg
        width={pane.width}
        height={pane.height}
        className="block overflow-visible"
        aria-hidden="true"
      >
        {drawings.map((d) => (
          <Shape key={d.id} chart={chart} series={series} d={d} />
        ))}
        {draft && drawing && (
          <Shape
            chart={chart}
            series={series}
            d={{
              id: "draft",
              tool: activeTool as ChartDrawing["tool"],
              start: draft.start,
              end: draft.end,
            }}
            draft
          />
        )}
      </svg>
    </div>
  );
}
