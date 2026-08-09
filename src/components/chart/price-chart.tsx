import { useEffect, useRef, useState } from "react";
import { generateCandles, type Candle } from "@/lib/market-data";
import { Skeleton } from "@/components/ui/skeleton";

export function PriceChart({
  seed = 42,
  height = 460,
  start = 112000,
  showVolume = true,
}: {
  seed?: number;
  height?: number;
  start?: number;
  showVolume?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const { createChart, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode } = await import(
        "lightweight-charts"
      );
      const el = containerRef.current;
      if (!el || disposed) return;

      const chart = createChart(el, {
        height,
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
        timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: "#1E2329" },
          horzLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: "#1E2329" },
        },
      });

      const candles: Candle[] = generateCandles(seed, 220, start);
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#2ED3A0",
        downColor: "#F0616D",
        borderUpColor: "#2ED3A0",
        borderDownColor: "#F0616D",
        wickUpColor: "#2ED3A0",
        wickDownColor: "#F0616D",
      });
      series.setData(candles.map((c) => ({ time: c.time as never, open: c.open, high: c.high, low: c.low, close: c.close })));

      if (showVolume) {
        const vol = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        });
        chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        vol.setData(
          candles.map((c) => ({
            time: c.time as never,
            value: c.volume,
            color: c.close >= c.open ? "rgba(46,211,160,0.35)" : "rgba(240,97,109,0.35)",
          })),
        );
      }

      chart.timeScale().fitContent();
      setReady(true);

      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      chart.applyOptions({ width: el.clientWidth });

      cleanup = () => {
        ro.disconnect();
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [seed, height, start, showVolume]);

  return (
    <div className="relative w-full">
      {!ready && <Skeleton className="absolute inset-0 rounded-lg" style={{ height }} />}
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
