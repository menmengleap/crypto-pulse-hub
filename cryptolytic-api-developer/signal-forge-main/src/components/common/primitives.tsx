import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={cn("panel", hover && "panel-hover", className)}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-border-strong" aria-hidden />
      <span className="mono-label">{children}</span>
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function StatusDot({ tone = "neutral" }: { tone?: "neutral" | "live" | "error" }) {
  return (
    <span className="relative flex h-1.5 w-1.5" aria-hidden>
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full",
          tone === "live" && "animate-ping bg-success/60",
          tone === "error" && "bg-destructive/50",
          tone === "neutral" && "bg-subtle/50",
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-1.5 w-1.5 rounded-full",
          tone === "live" && "bg-success",
          tone === "error" && "bg-destructive",
          tone === "neutral" && "bg-subtle",
        )}
      />
    </span>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface-2 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  loading = false,
}: {
  label: string;
  value: string | null;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="panel panel-hover p-5">
      <p className="mono-label">{label}</p>
      {loading ? (
        <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-3 font-mono text-2xl tracking-tight text-foreground">{value ?? "—"}</p>
      )}
      {hint && <p className="mt-2 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
