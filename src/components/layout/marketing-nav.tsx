import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LifeBuoy, Menu, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TerminalLink } from "./terminal-link";
import { useAuth, useAuthHydrated } from "@/lib/auth";
import { marketPageGroups, marketPages } from "@/lib/market-routes";
import myioLogo from "@/Img/myio.png";

export type MarketingTab = "new" | "pricing" | "market";

const tabItems: { label: string; tab: MarketingTab }[] = [
  { label: "New", tab: "new" },
  { label: "Pricing", tab: "pricing" },
];

function isActive(pathname: string, search: unknown, tab: MarketingTab) {
  if (pathname !== "/new") return false;
  const s = (search ?? {}) as Record<string, unknown>;
  const current = s["tab"];
  return current === tab || (current === undefined && tab === "new");
}

function pillLink(active: boolean) {
  return cn(
    "text-sm transition-colors",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );
}

/** The ten market tool pages as dropdown items — all link to the public /markets/* pages. */
function MarketDropdownItems() {
  return (
    <DropdownMenuContent align="center" className="w-64">
      {marketPageGroups.map((group) => (
        <div key={group}>
          {group !== "Markets" && <DropdownMenuSeparator />}
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {group}
          </DropdownMenuLabel>
          {marketPages
            .filter((p) => p.group === group)
            .map((p) => (
              <DropdownMenuItem key={p.publicTo} asChild>
                <Link to={p.publicTo} className="gap-2.5">
                  <p.icon className="size-3.5 text-muted-foreground" />
                  {p.label}
                </Link>
              </DropdownMenuItem>
            ))}
        </div>
      ))}
    </DropdownMenuContent>
  );
}

/** The same market tool pages as plain links for the mobile sheet. */
function MarketLinkList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-3">
      {marketPageGroups.map((group) => (
        <div key={group}>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {group}
          </p>
          <div className="mt-1 space-y-0.5">
            {marketPages
              .filter((p) => p.group === group)
              .map((p) => (
                <Link
                  key={p.publicTo}
                  to={p.publicTo}
                  onClick={onNavigate}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  <p.icon className="size-3.5" />
                  {p.label}
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname, search } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.search }),
  });
  const marketActive = pathname.startsWith("/markets");
  const onMore = pathname === "/support" || pathname === "/blog";
  const hydrated = useAuthHydrated();
  const accessToken = useAuth((s) => s.accessToken);
  // A persisted token means the user is signed in — show "Open terminal";
  // visitors with no session see "Sign up" instead. Hydration is awaited so a
  // signed-in user never briefly sees the wrong button on first paint.
  const signedIn = hydrated && Boolean(accessToken);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={myioLogo} alt="" className="h-9 w-auto shrink-0 object-contain" />
          <span className="truncate text-sm font-semibold tracking-tight">Cryptolytic</span>
        </Link>

        {/* Centered desktop nav: New · Pricing · Market · More */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
          {tabItems.map((n) => (
            <Link
              key={n.tab}
              to="/new"
              search={{ tab: n.tab }}
              className={pillLink(isActive(pathname, search, n.tab))}
            >
              {n.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn("group inline-flex items-center gap-1", pillLink(marketActive))}
            >
              Market
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform group-data-[state=open]:rotate-180",
                  marketActive && "rotate-180",
                )}
              />
            </DropdownMenuTrigger>
            <MarketDropdownItems />
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn("group inline-flex items-center gap-1", pillLink(onMore))}
            >
              More
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform group-data-[state=open]:rotate-180",
                  onMore && "rotate-180",
                )}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/support">
                  <LifeBuoy className="size-3.5 text-muted-foreground" />
                  Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/blog">
                  <Rss className="size-3.5 text-muted-foreground" />
                  Blog
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Actions — Sign up for visitors, Open terminal once signed in */}
        <div className="flex items-center gap-3">
          {!hydrated ? (
            <span
              aria-hidden
              className="inline-flex h-9 w-28 animate-pulse items-center justify-center rounded-full bg-muted"
            />
          ) : (
            <TerminalLink
              to="/ai-analysis"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_-12px_var(--primary)] transition-opacity hover:opacity-90"
            >
              {signedIn ? "Open terminal" : "Sign up"}
            </TerminalLink>
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
                <img src={myioLogo} alt="" className="h-8 w-auto object-contain" />
                <span className="text-sm font-semibold tracking-tight">Cryptolytic</span>
              </div>
              <nav className="flex flex-col gap-1 overflow-y-auto p-4">
                {tabItems.map((n) => (
                  <Link
                    key={n.tab}
                    to="/new"
                    search={{ tab: n.tab }}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                  >
                    {n.label}
                  </Link>
                ))}
                <div className="mt-3 border-t border-sidebar-border pt-3">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Market
                  </p>
                  <div className="mt-1.5">
                    <MarketLinkList onNavigate={() => setMobileOpen(false)} />
                  </div>
                </div>
                <Link
                  to="/support"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  Support
                </Link>
                <Link
                  to="/blog"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  Blog
                </Link>
                {hydrated && (
                  <TerminalLink
                    to="/ai-analysis"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
                  >
                    {signedIn ? "Open terminal" : "Sign up"}
                  </TerminalLink>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
