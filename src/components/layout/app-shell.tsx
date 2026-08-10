import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Bookmark,
  Brain,
  ChevronLeft,
  Filter,
  Gauge,
  Grid2x2,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  Menu,
  Newspaper,
  PieChart,
  Search,
  Settings,
  Star,
  Layers,
  Coins,
  User,
  Waves,
  GitCompareArrows,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "./global-search";
import { refreshMe } from "@/lib/api";
import { useAuth, useAuthHydrated } from "@/lib/auth";

// AppShell remounts on every console route navigation, but the profile only
// changes through /api/me/profile — refetch at most once per minute so page
// navigation doesn't spam the API.
const PROFILE_REFRESH_MS = 60_000;
let lastProfileRefresh = 0;
import myioLogo from "@/Img/myio.png";

type NavItem = { label: string; to: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Markets",
    items: [
      { label: "Market Overview", to: "/market", icon: LayoutDashboard },
      { label: "Spot Market", to: "/spot", icon: BarChart3 },
      { label: "Derivatives", to: "/derivatives", icon: Layers },
      { label: "Crypto Assets", to: "/assets", icon: Coins },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Fear & Greed", to: "/fear-greed", icon: Gauge },
      { label: "Market Sentiment", to: "/sentiment", icon: Activity },
      { label: "Market Cycle", to: "/cycle", icon: Waves },
      { label: "Bitcoin Dominance", to: "/dominance", icon: PieChart },
      { label: "Market Heatmap", to: "/heatmap", icon: Grid2x2 },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Advanced Chart", to: "/chart", icon: LineChart },
      { label: "Compare", to: "/compare", icon: GitCompareArrows },
      { label: "Watchlist", to: "/watchlist", icon: Star },
      { label: "News", to: "/news", icon: Newspaper },
      { label: "Screener", to: "/screener", icon: Filter },
      { label: "AI Analysis", to: "/ai-analysis", icon: Brain },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Alerts", to: "/alerts", icon: Bell },
      { label: "Saved Analysis", to: "/saved", icon: Bookmark },
      { label: "Profile", to: "/profile", icon: User },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

const mobileNav: NavItem[] = [
  { label: "Overview", to: "/market", icon: LayoutDashboard },
  { label: "Chart", to: "/chart", icon: LineChart },
  { label: "Screener", to: "/screener", icon: Filter },
  { label: "News", to: "/news", icon: Newspaper },
  { label: "Watchlist", to: "/watchlist", icon: Star },
];

export function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1">
      <img
        src={myioLogo}
        alt=""
        className="h-9 w-auto shrink-0 rounded-lg object-contain ring-1 ring-primary/30"
      />
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight">Cryptolytic</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            Market Intelligence
          </span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-5">
      {navGroups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.label}
            </p>
          )}
          {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-border" />}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              const link = (
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                  )}
                  <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Console access requires a signed-in session. Unauthenticated visitors are
  // sent to /login (client-side only — no SSR redirects).
  const accessToken = useAuth((s) => s.accessToken);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const clearSession = useAuth((s) => s.clearSession);
  const hydrated = useAuthHydrated();
  const navigate = useNavigate();

  // Gate the render behind mount so the server and first client paint agree
  // (both show the loader) — the guard then runs client-side without an SSR
  // hydration mismatch. The auth check is additionally deferred until zustand
  // has finished reading the persisted session from localStorage: checking
  // before hydration sees a false "signed out" and bounces to /login, which
  // then sees the hydrated token and bounces back — the redirect loop.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!hydrated) return;
    if (!accessToken) {
      // replace: true so the guarded route is not left in the back stack.
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
        replace: true,
      });
      return;
    }
    // Signed in — pull the real user + profile from the database so the
    // sidebar/navbar show fresh name, avatar and member-since date (covers
    // existing localStorage sessions; OAuth flow hydrates too). Throttled so
    // route navigation doesn't fire a request every page change.
    const now = Date.now();
    if (now - lastProfileRefresh > PROFILE_REFRESH_MS) {
      lastProfileRefresh = now;
      void refreshMe().catch(() => {});
    }
  }, [accessToken, hydrated, navigate]);

  if (!mounted || !hydrated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const displayName = profile?.displayName?.trim() || user?.name?.trim() || "Analyst";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatarUrl ?? "";
  const initials =
    ((displayName || user?.email || "??").match(/\b\w/g) ?? [])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  /** "Aug 10, 2026" from an ISO registration date. */
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <TooltipProvider delayDuration={120}>
      <div className="min-h-screen w-full bg-background">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex",
            collapsed ? "w-[76px]" : "w-[248px]",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center border-b border-sidebar-border px-4",
              collapsed && "justify-center px-0",
            )}
          >
            <Brand collapsed={collapsed} />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-5">
            <NavLinks collapsed={collapsed} />
          </div>
          <div className="space-y-3 border-t border-sidebar-border p-3">
            {!collapsed && (
              <Link
                to="/settings"
                className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent/60"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-primary/30"
                  />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {memberSince ? `Member since ${memberSince}` : email || "Account"}
                  </span>
                </span>
              </Link>
            )}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={cn("size-4 transition-transform", collapsed && "rotate-180")}
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        <div
          className={cn(
            "transition-[padding] duration-300",
            collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
          )}
        >
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-4" />
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-[272px] border-sidebar-border bg-sidebar p-0"
                  >
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <div className="flex h-16 items-center border-b border-sidebar-border px-4">
                      <Brand />
                    </div>
                    <div className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-5">
                      <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
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
                    <span className="hidden text-xs font-medium sm:block">{displayName}</span>
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
                          {memberSince && (
                            <p className="truncate text-[11px] text-muted-foreground/70">
                              Member since {memberSince}
                            </p>
                          )}
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
              </div>
            </div>
          </header>

          <main className="px-4 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <ul className="grid grid-cols-5">
            {mobileNav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground transition-colors"
                  activeProps={{ className: "!text-primary" }}
                >
                  <item.icon className="size-4.5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}
