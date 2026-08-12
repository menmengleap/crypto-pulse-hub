import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import myioLogo from "@/Img/myio.png";
import { useBackendHealth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TerminalLink } from "./terminal-link";

const linkCls =
  "text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground";

function LinkColumn({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {heading}
      </p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  const backend = useBackendHealth();
  const statusText =
    backend === "online"
      ? "All systems operational · API connected"
      : backend === "connecting"
        ? "Connecting to API…"
        : "API offline — frontend running on simulated data";
  return (
    <footer className="relative border-t border-border bg-background">
      {/* Subtle top sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-5">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src={myioLogo}
                alt="Cryptolytic logo"
                className="h-9 w-auto shrink-0 object-contain"
              />
              <span className="text-base font-semibold tracking-tight">Cryptolytic</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Market intelligence for serious crypto analysts — live charts, sentiment and
              AI-assisted research in one quiet terminal.
            </p>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="contents">
            {/* Product */}
            <div className="lg:col-span-3">
              <LinkColumn heading="Product">
                <li>
                  <Link to="/new" search={{ tab: "new" }} className={linkCls}>
                    New
                  </Link>
                </li>
                <li>
                  <Link to="/new" search={{ tab: "pricing" }} className={linkCls}>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className={linkCls}>
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/support" className={linkCls}>
                    Support
                  </Link>
                </li>
                <li>
                  <TerminalLink to="/ai-analysis" className={linkCls}>
                    Open terminal
                  </TerminalLink>
                </li>
              </LinkColumn>
            </div>

            {/* Legal */}
            <div className="lg:col-span-4">
              <LinkColumn heading="Legal">
                <li>
                  <Link to="/terms" className={linkCls}>
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/policy" className={linkCls}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/disclaimer" className={linkCls}>
                    Economic Disclaimer
                  </Link>
                </li>
              </LinkColumn>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Cryptolytic. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <span aria-hidden className="relative flex size-1.5">
              {backend !== "offline" && (
                <span
                  className={cn(
                    "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                    backend === "online" ? "bg-up" : "bg-amber-400",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex size-1.5 rounded-full",
                  backend === "online"
                    ? "bg-up"
                    : backend === "offline"
                      ? "bg-down"
                      : "bg-amber-400",
                )}
              />
            </span>
            {statusText}
          </p>
        </div>
      </div>
    </footer>
  );
}
