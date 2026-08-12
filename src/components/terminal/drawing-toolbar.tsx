import {
  Crosshair,
  Eraser,
  Hash,
  Minimize2,
  MousePointer2,
  Move,
  MoveVertical,
  PenLine,
  SlidersHorizontal,
  Square,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { DrawingToolId } from "@/lib/chart-drawings";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TOOLS: { id: DrawingToolId; label: string; icon: LucideIcon; hint?: string }[] = [
  { id: "pointer", label: "Crosshair / select", icon: Crosshair, hint: "Esc" },
  { id: "trend", label: "Trend line", icon: TrendingUp, hint: "T" },
  { id: "horizontal", label: "Horizontal line", icon: SlidersHorizontal, hint: "H" },
  { id: "vertical", label: "Vertical line", icon: MoveVertical, hint: "V" },
  { id: "ray", label: "Ray", icon: Move, hint: "R" },
  { id: "rectangle", label: "Rectangle", icon: Square, hint: "B" },
  { id: "fib", label: "Fibonacci retracement", icon: Hash, hint: "F" },
];

/**
 * Narrow vertical drawing rail along the chart's left edge — mirrors
 * professional charting apps. Collapsible via the workspace store.
 */
export function DrawingToolbar({
  activeTool,
  onActiveTool,
  drawings,
  onClearDrawings,
}: {
  activeTool: DrawingToolId | null;
  onActiveTool: (t: DrawingToolId | null) => void;
  drawings: unknown[];
  onClearDrawings: () => void;
}) {
  const workspace = useWorkspace();

  return (
    <div className="flex h-full w-9 shrink-0 flex-col items-center border-r border-border bg-surface/40 py-1.5">
      <TooltipProvider delayDuration={200}>
        {TOOLS.map((t) => {
          const active = activeTool === t.id;
          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onActiveTool(active ? null : t.id)}
                  aria-label={t.label}
                  className={cn(
                    "grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  <t.icon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[10px]">
                {t.label}
                {t.hint ? ` (${t.hint})` : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {drawings.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClearDrawings}
                aria-label="Clear all drawings"
                className="mt-1 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-down/10 hover:text-down"
              >
                <Eraser className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px]">
              Clear drawings
            </TooltipContent>
          </Tooltip>
        )}

        <div className="mt-auto flex flex-col items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onActiveTool("pointer")}
                aria-label="Pointer"
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MousePointer2 className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px]">
              Pointer (Esc)
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => workspace.setLeftToolbar(false)}
                aria-label="Collapse toolbar"
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Minimize2 className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px]">
              Collapse toolbar
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
