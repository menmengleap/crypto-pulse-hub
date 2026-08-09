import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "var(--gradient-glow)" }}
      />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Flame className="size-4.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Cryptolytic</span>
        </Link>
        <div className="panel p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6 space-y-4">{children}</div>
        </div>
        <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}
