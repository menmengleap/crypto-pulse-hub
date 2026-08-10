import { useId } from "react";
import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  positive,
  className,
  strokeWidth = 1.75,
  fill = true,
  dot = false,
}: {
  data: number[];
  positive?: boolean;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
  /** Render a small end-point marker (TradingView style). */
  dot?: boolean;
}) {
  const id = useId();
  // Not enough points to draw a meaningful line.
  if (data.length < 2) return null;
  const up = positive ?? (data.at(-1) ?? 0) >= (data[0] ?? 0);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  const color = up ? "var(--up)" : "var(--down)";
  const last = pts.at(-1);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#g-${id})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {dot && last && (
        <circle
          cx={w}
          cy={parseFloat(last.split(",")[1] ?? "0")}
          r={1.9}
          fill={color}
          stroke="var(--background)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
