import type { LucideIcon } from "lucide-react";
import { TerminalLink } from "@/components/layout/terminal-link";

/**
 * Header for the public homepage market pages. Sets the title + subtitle and
 * an "Open in terminal" CTA so visitors always know these pages live on the
 * homepage — the console version is one deliberate click away, never a forced
 * redirect.
 */
export function PublicMarketPageHeader({
  title,
  subtitle,
  icon: Icon,
  consoleTo,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  consoleTo: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Icon className="size-3.5 text-primary" />
          Homepage · Markets
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <TerminalLink
        to={consoleTo}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40"
      >
        Open in terminal
      </TerminalLink>
    </div>
  );
}
