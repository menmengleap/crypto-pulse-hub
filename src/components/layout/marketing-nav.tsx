import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LifeBuoy, Menu, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TerminalLink } from "./terminal-link";
import { useAuth, useAuthHydrated } from "@/lib/auth";
import myioLogo from "@/Img/myio.png";

export type MarketingTab = "new" | "pricing" | "market";

const navItems: { label: string; tab: MarketingTab }[] = [
  { label: "New", tab: "new" },
  { label: "Pricing", tab: "pricing" },
  { label: "Market", tab: "market" },
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

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname, search } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.search }),
  });
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
          {navItems.map((n) => (
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
              to="/market"
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
              <nav className="flex flex-col gap-1 p-4">
                {navItems.map((n) => (
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
                <Link
                  to="/support"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
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
                    to="/market"
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
