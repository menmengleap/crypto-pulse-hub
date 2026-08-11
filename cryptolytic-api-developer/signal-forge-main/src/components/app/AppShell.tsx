import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BookOpen,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Search,
  Settings,
  Terminal,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/site/Navbar";
import { useAuth } from "@/hooks/use-auth";
import { API_CONFIGURED } from "@/lib/api/config";

const PRIMARY = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Indicators", to: "/indicators", icon: LineChart },
  { label: "API Playground", to: "/playground", icon: Terminal },
  { label: "API Keys", to: "/api-keys", icon: KeyRound },
  { label: "Usage", to: "/usage", icon: Gauge },
  { label: "Documentation", to: "/docs", icon: BookOpen },
] as const;

const SECONDARY = [{ label: "Settings", to: "/settings", icon: Settings }] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, ready, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <SidebarBody />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar lg:hidden"
              aria-label="Navigation drawer"
            >
              <SidebarBody onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <div className="relative w-full max-w-[13rem] sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Search indicators, docs…"
                  aria-label="Search"
                  className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-subtle focus:border-border-strong focus:outline-none"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate({ to: "/indicators" });
                  }}
                />
              </div>
              <Link
                to="/docs"
                className="hidden shrink-0 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Docs
              </Link>
              {ready && isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    navigate({ to: "/login" });
                  }}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-6xl"
          >
            {children ?? <Outlet />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function SidebarBody({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
        <Link to="/">
          <Logo />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <nav aria-label="Application" className="scroll-thin flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {PRIMARY.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </ul>
        <div className="my-4 h-px bg-border" />
        <ul className="space-y-1">
          {SECONDARY.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-2 border-t border-border px-4 py-4">
        <Activity className="h-3.5 w-3.5 text-subtle" aria-hidden />
        <span className="mono-label">{API_CONFIGURED ? "Connected" : "Not connected"}</span>
      </div>
    </>
  );
}

function SidebarItem({
  label,
  to,
  icon: Icon,
}: {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
        )}
        activeProps={{ className: "bg-sidebar-accent text-foreground" }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
