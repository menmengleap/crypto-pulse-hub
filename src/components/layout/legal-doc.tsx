import type { ReactNode } from "react";
import { MarketingLayout } from "./marketing-layout";

export function LegalDoc({
  icon,
  label,
  title,
  updated,
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <MarketingLayout className="max-w-3xl space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-xs text-muted-foreground">Last updated {updated}</p>
      </div>
      <div className="space-y-8">{children}</div>
    </MarketingLayout>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
