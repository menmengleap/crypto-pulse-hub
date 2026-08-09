import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MarketingNav } from "./marketing-nav";
import { SiteFooter } from "./site-footer";

export function MarketingLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main>
        <div className={cn("mx-auto max-w-7xl px-4 py-10 sm:px-6", className)}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
