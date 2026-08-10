import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IndicatorLine } from "@/types/indicator";

const STROKES = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

export default function LineChartPanel({
  lines,
  names,
}: {
  lines: Record<string, IndicatorLine>;
  names: string[];
}) {
  const data = useMemo(() => {
    const byTime = new Map<number, Record<string, number>>();
    for (const name of names) {
      for (const point of lines[name] ?? []) {
        const row = byTime.get(point.time) ?? { time: point.time };
        row[name] = point.value;
        byTime.set(point.time, row);
      }
    }
    return Array.from(byTime.values()).sort((a, b) => (a["time"] ?? 0) - (b["time"] ?? 0));
  }, [lines, names]);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "var(--color-subtle)", fontSize: 10 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => String(value)}
            minTickGap={32}
          />
          <YAxis
            tick={{ fill: "var(--color-subtle)", fontSize: 10 }}
            stroke="var(--color-border)"
            width={56}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-subtle)" }}
          />
          {names.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={STROKES[index % STROKES.length]}
              strokeWidth={1.4}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
