import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";

export const UP_COLOR = "#16c784";
export const DOWN_COLOR = "#ea3943";
export const MUTED_COLOR = "#7d8998";

const BASE_TIME = 1704067200;

export type MiniPoint = { time: number; value: number; color?: string };

let lwcPromise: Promise<typeof import("lightweight-charts")> | null = null;
const loadLwc = () => (lwcPromise ??= import("lightweight-charts"));

/**
 * Small decorative lightweight-charts widget — area line, histogram bars, or a
 * horizontal meter (via `track`). Axes and grid are hidden; used for chat cards
 * and the AI analysis panel. The chart is rebuilt whenever the data or options
 * change (keyed on the serialized values, not array identity).
 */
export function MiniChart({
  data,
  color,
  positive,
  height = 48,
  className,
  priceLines = [],
  range,
  bars = false,
  track,
}: {
  data: number[] | MiniPoint[];
  color?: string;
  /** Auto-color by direction when `color` is omitted. */
  positive?: boolean;
  height?: number;
  className?: string;
  priceLines?: { price: number; color: string; title?: string }[];
  /** Lock the price scale to this range (via an invisible anchor series). */
  range?: { min: number; max: number };
  /** Render as histogram bars (area line otherwise). */
  bars?: boolean;
  /** Optional full-height background bar behind histogram fills (gauge track). */
  track?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointsRef = useRef<MiniPoint[]>([]);
  const priceLinesRef = useRef(priceLines);
  const rangeRef = useRef(range);

  const points: MiniPoint[] =
    Array.isArray(data) && typeof data[0] === "number"
      ? (data as number[]).map((v, i) => ({ time: BASE_TIME + i, value: v }))
      : (data as MiniPoint[]);

  const resolved =
    color ??
    ((positive ?? (points.at(-1)?.value ?? 0) >= (points[0]?.value ?? 0)) ? UP_COLOR : DOWN_COLOR);

  pointsRef.current = points;
  priceLinesRef.current = priceLines;
  rangeRef.current = range;

  const dataKey = JSON.stringify(points);
  const priceLinesKey = JSON.stringify(priceLines);
  const rangeKey = JSON.stringify(range);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || pointsRef.current.length === 0) return;
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const lwc = await loadLwc();
      if (disposed || !el.isConnected) return;

      const {
        createChart,
        AreaSeries,
        HistogramSeries,
        LineSeries,
        ColorType,
        LineStyle,
        CrosshairMode,
      } = lwc;

      const chart: IChartApi = createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "transparent",
          fontFamily: "Inter, sans-serif",
          attributionLogo: false,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false, borderVisible: false },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
      });

      const pts = pointsRef.current;
      const rng = rangeRef.current;

      if (track !== undefined && bars) {
        const trackSeries = chart.addSeries(HistogramSeries, {
          base: 0,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        trackSeries.setData(
          pts.map((p) => ({
            time: p.time as Time,
            value: track,
            color: "rgba(255,255,255,0.07)",
          })),
        );
      }

      let series: ISeriesApi<"Area"> | ISeriesApi<"Histogram">;
      if (bars) {
        series = chart.addSeries(HistogramSeries, {
          base: 0,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(
          pts.map((p) => ({
            time: p.time as Time,
            value: p.value,
            color: p.color ?? resolved,
          })),
        );
      } else {
        series = chart.addSeries(AreaSeries, {
          lineColor: resolved,
          topColor: `${resolved}2e`,
          bottomColor: `${resolved}00`,
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
        series.setData(pts.map((p) => ({ time: p.time as Time, value: p.value })));
      }

      for (const pl of priceLinesRef.current) {
        series.createPriceLine({
          price: pl.price,
          color: pl.color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          ...(pl.title !== undefined ? { title: pl.title } : {}),
        });
      }

      if (rng) {
        const anchor = chart.addSeries(LineSeries, {
          color: "rgba(0,0,0,0)",
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
        anchor.setData([
          { time: (pts[0]?.time ?? BASE_TIME) as Time, value: rng.min },
          { time: (pts.at(-1)?.time ?? BASE_TIME + 1) as Time, value: rng.max },
        ]);
      }

      chart.timeScale().fitContent();

      const ro = new ResizeObserver(() => {
        chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      });
      ro.observe(el);

      cleanup = () => {
        ro.disconnect();
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [dataKey, priceLinesKey, rangeKey, resolved, bars, track, height]);

  return <div ref={containerRef} className={className} style={{ height }} />;
}
