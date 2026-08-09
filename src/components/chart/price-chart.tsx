import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { fetchKlines, subscribeKline, type Candle } from "@/lib/realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveBadge } from "@/components/market/live-badge";
import { DrawingOverlay } from "@/components/chart/drawing-overlay";
import type { ChartDrawing, DrawingToolId } from "@/lib/chart-drawings";

export type ChartStyle = "candles" | "line" | "area";

export type AnySeries = ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;

const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export function PriceChart({
  symbol = "BTC",
  tf = "4H",
  height = 460,
  showVolume = true,
  chartType = "candles",
  upColor = "#2ED3A0",
  downColor = "#F0616D",
  activeTool = null,
  drawings = [],
  onDrawingsChange,
}: {
  symbol?: string;
  tf?: string;
  height?: number;
  showVolume?: boolean;
  chartType?: ChartStyle;
  upColor?: string;
  downColor?: string;
  activeTool?: DrawingToolId | null;
  drawings?: ChartDrawing[];
  onDrawingsChange?: (d: ChartDrawing[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<AnySeries | null>(null);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(false);

  // Keep the latest colors/height available to the chart-creation effect without recreating it on change.
  const upColorRef = useRef(upColor);
  const downColorRef = useRef(downColor);
  useEffect(() => {
    upColorRef.current = upColor;
    downColorRef.current = downColor;
  }, [upColor, downColor]);
  const heightRef = useRef(height);
  useEffect(() => {
    heightRef.current = height;
    chartRef.current?.applyOptions({ height });
  }, [height]);

  // Live style + color updates without recreating the chart.
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    if (chartType === "candles") {
      (s as ISeriesApi<"Candlestick">).applyOptions({
        upColor,
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    } else if (chartType === "line") {
      (s as ISeriesApi<"Line">).applyOptions({ color: upColor });
    } else {
      (s as ISeriesApi<"Area">).applyOptions({
        lineColor: upColor,
        topColor: `${upColor}59`,
        bottomColor: `${upColor}00`,
      });
    }
  }, [upColor, downColor, chartType]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const {
        createChart,
        CandlestickSeries,
        LineSeries,
        AreaSeries,
        HistogramSeries,
        ColorType,
        CrosshairMode,
      } = await import("lightweight-charts");
      const el = containerRef.current;
      if (!el || disposed) return;

      let candles: Candle[];
      try {
        candles = await fetchKlines(symbol, tf, 320);
      } catch {
        if (!disposed) setError(true);
        return;
      }
      if (disposed || !el.isConnected) return;

      const chart = createChart(el, {
        height: heightRef.current,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9AA1AA",
          fontFamily: "Inter, sans-serif",
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
        timeScale: {
          borderColor: "rgba(255,255,255,0.08)",
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: "#1E2329" },
          horzLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: "#1E2329" },
        },
      });
      chartRef.current = chart;

      const uc = upColorRef.current;
      const dc = downColorRef.current;

      let series: AnySeries;
      if (chartType === "candles") {
        series = chart.addSeries(CandlestickSeries, {
          upColor: uc,
          downColor: dc,
          borderUpColor: uc,
          borderDownColor: dc,
          wickUpColor: uc,
          wickDownColor: dc,
        });
        series.setData(
          candles.map((c) => ({
            time: c.time as never,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
      } else if (chartType === "line") {
        series = chart.addSeries(LineSeries, { color: uc, lineWidth: 2 });
        series.setData(candles.map((c) => ({ time: c.time as never, value: c.close })));
      } else {
        series = chart.addSeries(AreaSeries, {
          lineColor: uc,
          topColor: `${uc}59`,
          bottomColor: `${uc}00`,
          lineWidth: 2,
        });
        series.setData(candles.map((c) => ({ time: c.time as never, value: c.close })));
      }
      seriesRef.current = series;

      let volSeries: ISeriesApi<"Histogram"> | null = null;
      if (showVolume) {
        volSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        volSeries.setData(
          candles.map((c) => ({
            time: c.time as never,
            value: c.volume,
            color: c.close >= c.open ? withAlpha(uc, 0.35) : withAlpha(dc, 0.35),
          })),
        );
      }

      chart.timeScale().fitContent();
      setReady(true);

      const unsub = subscribeKline(symbol, tf, (c) => {
        if (chartType === "candles") {
          (series as ISeriesApi<"Candlestick">).update({
            time: c.time as never,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          });
        } else {
          (series as ISeriesApi<"Line" | "Area">).update({
            time: c.time as never,
            value: c.close,
          });
        }
        if (volSeries) {
          volSeries.update({
            time: c.time as never,
            value: c.volume,
            color:
              c.close >= c.open
                ? withAlpha(upColorRef.current, 0.35)
                : withAlpha(downColorRef.current, 0.35),
          });
        }
        setLive(true);
      });

      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      chart.applyOptions({ width: el.clientWidth });

      cleanup = () => {
        ro.disconnect();
        unsub();
        chartRef.current = null;
        seriesRef.current = null;
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [symbol, tf, showVolume, chartType]);

  return (
    <div className="relative w-full">
      {!ready && !error && <Skeleton className="absolute inset-0 rounded-lg" style={{ height }} />}
      {error && (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground"
          style={{ height }}
        >
          Unable to load live chart data for {symbol} — check your connection.
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height }} />
      {ready && (
        <DrawingOverlay
          key={`${symbol}-${tf}-${chartType}`}
          chartRef={chartRef}
          seriesRef={seriesRef}
          activeTool={activeTool}
          drawings={drawings}
          onDrawingsChange={onDrawingsChange ?? (() => {})}
        />
      )}
      {ready && live && <LiveBadge className="pointer-events-none absolute right-3 top-2.5" />}
    </div>
  );
}
