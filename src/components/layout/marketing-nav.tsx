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
    "rounded-full px-3.5 py-1.5 text-sm transition-colors",
    active
      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
  );
}

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname, search } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.search }),
  });
  const onMore = pathname === "/support" || pathname === "/blog";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src={myioLogo}
            alt=""
            className="h-9 w-auto shrink-0 rounded-lg object-contain ring-1 ring-primary/30"
          />
          <span className="truncate text-sm font-semibold tracking-tight">Cryptolytic</span>
        </Link>

        {/* Centered desktop nav: New · Pricing · Market · More */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-border bg-surface/70 p-1 backdrop-blur-md lg:flex">
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Sign in
          </Link>
          <Link
            to="/market"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_-12px_var(--primary)] transition-opacity hover:opacity-90"
          >
            Open terminal
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
                <img
                  src={myioLogo}
                  alt=""
                  className="h-8 w-auto rounded-lg object-contain ring-1 ring-primary/30"
                />
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
                <Link
                  to="/market"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Open terminal
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-border px-3 py-2.5 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  Sign in
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
