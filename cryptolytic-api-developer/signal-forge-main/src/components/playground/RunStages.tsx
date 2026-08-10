import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const RUN_STAGES = ["Validating", "Processing candles", "Calculating indicators", "Building response"] as const;
export type RunStage = (typeof RUN_STAGES)[number];

export function RunStages({
  activeIndex,
  done,
}: {
  activeIndex: number;
  done: boolean;
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-live="polite">
      {RUN_STAGES.map((stage, index) => {
        const complete = done || index < activeIndex;
        const active = !done && index === activeIndex;
        return (
          <li key={stage}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2.5",
                complete && "border-border-strong bg-surface-2",
                active && "border-border-strong bg-surface-2",
                !complete && !active && "border-border bg-surface",
              )}
            >
              {complete ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-foreground" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-subtle/50" aria-hidden />
              )}
              <span
                className={cn(
                  "truncate font-mono text-[11px] uppercase tracking-widest",
                  complete || active ? "text-foreground" : "text-subtle",
                )}
              >
                {stage}
              </span>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}
