import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "./global-search";
import { useSessionGate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import myioLogo from "@/Img/myio.png";

export function Brand({ subtitle = "Market Intelligence" }: { subtitle?: string }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 px-1">
      <img src={myioLogo} alt="" className="h-9 w-auto shrink-0 object-contain" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight">Cryptolytic</span>
        <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

/**
 * The signed-in account menu (avatar → profile / saved / settings / sign out).
 * Shared by the console pages' header and the full-screen Advanced Chat so the
 * chat-driven console keeps account management one click away.
 */
export function AccountMenu() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const clearSession = useAuth((s) => s.clearSession);

  const displayName = profile?.displayName?.trim() || user?.name?.trim() || "Analyst";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatarUrl ?? "";
  const initials =
    ((displayName || user?.email || "??").match(/\b\w/g) ?? [])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border p-1 pr-2 transition-colors hover:border-primary/40">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-7 rounded-md object-cover ring-1 ring-primary/30"
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
            {initials}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-xs font-medium sm:block">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-10 rounded-lg object-cover ring-1 ring-primary/30"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {email || "Signed in via OAuth"}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/saved">Saved analysis</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            clearSession();
            void navigate({ to: "/login", replace: true });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  // Console access requires a signed-in session. Unauthenticated visitors are
  // sent to /login (client-side only — no SSR redirects).
  const { loading: authLoading, authed } = useSessionGate();

  // Gate the render behind mount so the server and first client paint agree
  // (both show the loader) — the guard then runs client-side without an SSR
  // hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!authed) {
      // replace: true so the guarded route is not left in the back stack.
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
        replace: true,
      });
    }
  }, [mounted, authLoading, authed, navigate]);

  if (!mounted || authLoading || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden shrink-0 sm:block">
              <Brand />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {title}
              </h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:flex xl:w-72"
            >
              <Search className="size-3.5" />
              <span className="flex-1 text-left">Search assets, news…</span>
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground md:hidden"
            >
              <Search className="size-4" />
            </button>
            {actions}
            <Link
              to="/blog"
              aria-label="Updates & blog"
              className="relative grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
            </Link>
            <Link
              to="/settings"
              aria-label="Settings"
              className="hidden size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground sm:grid"
            >
              <Settings className="size-4" />
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="px-4 pb-10 pt-5 sm:px-6">{children}</main>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
