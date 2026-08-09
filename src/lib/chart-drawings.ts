import type { UTCTimestamp } from "lightweight-charts";

export type DrawingToolId =
  "pointer" | "trend" | "horizontal" | "vertical" | "ray" | "rectangle" | "fib";

export type DrawingPoint = { time: UTCTimestamp; price: number };

export type ChartDrawing = {
  id: string;
  tool: Exclude<DrawingToolId, "pointer">;
  start: DrawingPoint;
  end: DrawingPoint;
};

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
