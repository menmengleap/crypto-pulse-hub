import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { fetchKlines, normalizeInterval, subscribeKline, type Candle } from "@/lib/realtime";
import {
  presetByKey,
  resolvePresets,
  useIndicatorSeries,
  type IndicatorPreset,
  type IndicatorResult,
} from "@/lib/indicators";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveBadge } from "@/components/market/live-badge";
import { DrawingOverlay } from "@/components/chart/drawing-overlay";
import type { ChartDrawing, DrawingToolId } from "@/lib/chart-drawings";

export type ChartStyle = "candles" | "line" | "area";

export type AnySeries = ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;

type IndicatorSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

/** Width of every sub-pane band (volume / RSI / MACD) as a fraction of height. */
const SUB_PANE_HEIGHT = 0.18;

const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Lay out the price pane + sub-panes using per-scale margins.
 *
 * Sub-panes stack below the price pane (top → bottom: volume, RSI, MACD) and
 * each gets an equal band. The price scale's bottom margin grows with the
 * number of active sub-panes so price always occupies the top.
 *
 * `existingPaneIds` guards against touching scales that don't exist yet —
 * custom scales only come into being when a series is attached to them, so on
 * the first render (indicator data still loading) only the built-in "right"
 * and "volume" scales are safe to configure.
 */
function applyPaneMargins(
  chart: IChartApi,
  activeKeys: string[],
  showVolume: boolean,
  existingPaneIds: Set<string>,
) {
  const paneIds: string[] = [];
  if (showVolume && existingPaneIds.has("volume")) paneIds.push("volume");
  for (const key of activeKeys) {
    const paneId = presetByKey(key)?.paneId;
    if (paneId && !paneIds.includes(paneId) && existingPaneIds.has(paneId)) {
      paneIds.push(paneId);
    }
  }
  const n = paneIds.length;
  chart
    .priceScale("right")
    .applyOptions({ scaleMargins: { top: 0.05, bottom: n * SUB_PANE_HEIGHT } });
  paneIds.forEach((id, i) => {
    chart.priceScale(id).applyOptions({
      scaleMargins: {
        top: 1 - n * SUB_PANE_HEIGHT + i * SUB_PANE_HEIGHT,
        bottom: 1 - n * SUB_PANE_HEIGHT + (i + 1) * SUB_PANE_HEIGHT,
      },
    });
  });
}

/** True when `result` is the computation for `preset` (type + params match). */
function presetMatchesResult(preset: IndicatorPreset, result: IndicatorResult): boolean {
  if (preset.spec.type !== result.type) return false;
  return Object.entries(preset.spec.params).every(([k, v]) => result.params[k] === v);
}

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
  indicators = [],
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
  /** Active indicator preset keys (see INDICATOR_PRESETS in lib/indicators). */
  indicators?: string[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<AnySeries | null>(null);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(false);

  // Last kline window fetched for the current symbol/timeframe. Live updates
  // mutate the last row in place (same-bar ticks) or append (new bar) so the
  // indicator window key only changes when a fresh fetch or a new bar lands.
  const [candlesState, setCandlesState] = useState<{
    symbol: string;
    tf: string;
    rows: Candle[];
  } | null>(null);

  // Indicator rendering state.
  const indicatorSeriesRef = useRef<Map<string, IndicatorSeries>>(new Map());
  const lwcRef = useRef<{
    LineSeries: (typeof import("lightweight-charts"))["LineSeries"];
    HistogramSeries: (typeof import("lightweight-charts"))["HistogramSeries"];
    LineStyle: (typeof import("lightweight-charts"))["LineStyle"];
  } | null>(null);

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
        LineStyle,
      } = await import("lightweight-charts");
      lwcRef.current = { LineSeries, HistogramSeries, LineStyle };
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
      setCandlesState({ symbol, tf, rows: candles });

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
        // Mirror the live bar into the indicator window (replace in place or
        // append a new bar — both change the window key only when it matters).
        setCandlesState((prev) => {
          if (!prev || prev.symbol !== symbol || prev.tf !== tf) return prev;
          const rows = [...prev.rows];
          const last = rows[rows.length - 1];
          if (last && c.time === last.time) {
            rows[rows.length - 1] = c;
          } else if (c.time > (last?.time ?? 0)) {
            rows.push(c);
            if (rows.length > 320) rows.shift();
          }
          return { ...prev, rows };
        });
      });

      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      chart.applyOptions({ width: el.clientWidth });

      cleanup = () => {
        ro.disconnect();
        unsub();
        lwcRef.current = null;
        indicatorSeriesRef.current.clear();
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

  // ---------------------------------------------------------------------------
  // Indicators — computed by the Python microservice via the Go gateway.
  // ---------------------------------------------------------------------------

  const indicatorQuery = useIndicatorSeries({
    symbol,
    timeframe: normalizeInterval(tf),
    candles:
      candlesState && candlesState.symbol === symbol && candlesState.tf === tf
        ? candlesState.rows
        : [],
    candleWindow: candlesState
      ? `${candlesState.rows.length}:${candlesState.rows.at(-1)?.time ?? 0}`
      : "",
    activeKeys: indicators,
  });

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ready) return;

    const activePresets = resolvePresets(indicators);
    const series = indicatorSeriesRef.current;
    const response = indicatorQuery.response;

    // Data belongs to a different symbol/timeframe window (mid-refetch after a
    // symbol change) — every indicator series is stale, drop them all.
    const stale = response !== null && response !== undefined && response.symbol !== symbol;
    const staleTf =
      response !== null && response !== undefined && response.timeframe !== normalizeInterval(tf);

    // 1. Drop series that were toggled off, or belong to a stale window.
    const wanted = new Set<string>();
    for (const preset of activePresets) {
      for (const lineId of Object.keys(preset.colors)) {
        wanted.add(`${preset.key}:${lineId}`);
      }
    }
    for (const [key, s] of [...series.entries()]) {
      if (!wanted.has(key) || stale || staleTf) {
        chart.removeSeries(s);
        series.delete(key);
      }
    }

    const lwc = lwcRef.current;
    if (lwc && !stale && !staleTf && response && activePresets.length > 0) {
      // 2. Create/update the series for every active indicator. Results are
      //    matched by type + params (not array index), so rendering never
      //    depends on the service echoing request order.
      activePresets.forEach((preset) => {
        const result = response.results.find((r) => presetMatchesResult(preset, r));
        if (!result) return;

        for (const [lineId, points] of Object.entries(result.lines)) {
          const key = `${preset.key}:${lineId}`;
          const color = preset.colors[lineId] ?? "#9AA1AA";
          const isHistogram = preset.key === "macd" && lineId === "histogram";

          let s = series.get(key);
          if (!s) {
            if (isHistogram) {
              s = chart.addSeries(lwc.HistogramSeries, {
                priceScaleId: preset.paneId ?? "right",
                base: 0,
                lastValueVisible: false,
                priceLineVisible: false,
              });
            } else {
              const line = chart.addSeries(lwc.LineSeries, {
                color,
                lineWidth: 2,
                priceScaleId: preset.paneId ?? "right",
                lineStyle: preset.dashed?.includes(lineId)
                  ? lwc.LineStyle.Dashed
                  : lwc.LineStyle.Solid,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
              });
              for (const lv of preset.levels ?? []) {
                line.createPriceLine({
                  price: lv.price,
                  color: lv.color,
                  lineWidth: 1,
                  lineStyle: lwc.LineStyle.Dashed,
                  axisLabelVisible: true,
                  title: lv.title,
                });
              }
              s = line;
            }
            series.set(key, s);
          }

          if (isHistogram) {
            (s as ISeriesApi<"Histogram">).setData(
              points.map((p) => ({
                time: p.time as never,
                value: p.value,
                color:
                  p.value >= 0
                    ? withAlpha(upColorRef.current, 0.5)
                    : withAlpha(downColorRef.current, 0.5),
              })),
            );
          } else {
            (s as ISeriesApi<"Line">).setData(
              points.map((p) => ({ time: p.time as never, value: p.value })),
            );
          }
        }
      });
    }

    // 3. Reconcile pane layout (volume/RSI/MACD bands + price margins). Runs
    //    after series creation so every custom scale exists; the guard set
    //    keeps us from touching scales that were never created.
    const existingPaneIds = new Set<string>();
    if (showVolume) existingPaneIds.add("volume");
    for (const key of series.keys()) {
      const paneId = presetByKey(key.split(":")[0] ?? "")?.paneId;
      if (paneId) existingPaneIds.add(paneId);
    }
    applyPaneMargins(chart, indicators, showVolume, existingPaneIds);
  }, [ready, indicatorQuery.response, indicators, showVolume, symbol, tf]);

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
      {ready && indicators.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-2.5 z-10">
          {indicatorQuery.error ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
              <span className="size-1.5 shrink-0 rounded-full bg-down" />
              Indicator service unavailable — candles only
            </span>
          ) : indicatorQuery.loading ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
              <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
              Computing indicators…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
              <span className="size-1.5 shrink-0 rounded-full bg-up" />
              Indicators live
            </span>
          )}
        </div>
      )}
    </div>
  );
}
