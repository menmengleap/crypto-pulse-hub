import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Bookmark, CalendarDays, Edit3, Laptop, Mail, ShieldCheck, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import { api, refreshMe, sessionsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Cryptolytic" },
      {
        name: "description",
        content: "Your Cryptolytic account — profile, member details and account activity.",
      },
      { property: "og:title", content: "Profile — Cryptolytic" },
    ],
  }),
  component: ProfilePage,
});

type AccountStats = {
  devices: number;
  watchlists: number;
  alerts: number;
  analyses: number;
};

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function ProfilePage() {
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Pull live data from the backend on every visit: the session gate already
  // validated /api/me, but this refreshes the profile and reads the account's
  // live totals (devices, watchlists, alerts, saved analyses) straight from
  // the database behind the API.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      refreshMe(),
      sessionsApi.list(),
      api.get<unknown[]>("/watchlists"),
      api.get<unknown[]>("/alerts"),
      api.get<unknown[]>("/analyses"),
    ]).then(([me, sessions, watchlists, alerts, analyses]) => {
      if (cancelled) return;
      setStats({
        devices: sessions.status === "fulfilled" ? sessions.value.length : 0,
        watchlists: watchlists.status === "fulfilled" ? watchlists.value.length : 0,
        alerts: alerts.status === "fulfilled" ? alerts.value.length : 0,
        analyses: analyses.status === "fulfilled" ? analyses.value.length : 0,
      });
      if (me.status === "rejected") {
        setNotice("Some live account data could not be loaded right now.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.displayName?.trim() || user?.name?.trim() || "Analyst";
  const email = user?.email ?? "";
  const initials = ((displayName || email || "??").match(/\b\w/g) ?? [])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarUrl = profile?.avatarUrl ?? "";

  const statCards = [
    {
      label: "Devices",
      value: stats ? String(stats.devices) : "…",
      to: "/settings",
      icon: Laptop,
    },
    {
      label: "Watchlists",
      value: stats ? String(stats.watchlists) : "…",
      to: "/watchlist",
      icon: Star,
    },
    {
      label: "Alerts",
      value: stats ? String(stats.alerts) : "…",
      to: "/alerts",
      icon: Bell,
    },
    {
      label: "Saved analyses",
      value: stats ? String(stats.analyses) : "…",
      to: "/saved",
      icon: Bookmark,
    },
  ];

  return (
    <AppShell title="Profile" subtitle="Your account, straight from the database">
      <div className="space-y-4">
        {/* Identity header */}
        <Panel bodyClassName="p-0">
          <div className="h-24 rounded-t-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent sm:h-28" />
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="-mt-10 flex flex-wrap items-end gap-4">
              <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-border bg-surface shadow-lg ring-2 ring-background">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-xl font-semibold text-primary">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold tracking-tight">{displayName}</h2>
                  {user?.role && user.role !== "user" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      <ShieldCheck className="size-3" />
                      {user.role}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <Mail className="size-3 shrink-0" />
                  {email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pb-1">
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40"
                >
                  <Edit3 className="size-3.5" />
                  Edit profile
                </Link>
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Laptop className="size-3.5" />
                  Manage devices
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="size-3" />
                  Member since
                </p>
                <p className="mt-1 text-sm font-medium">{fmtDate(user?.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-medium">
                  {user?.isActive === false ? "Suspended" : "Active account"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Display name
                </p>
                <p className="mt-1 truncate text-sm font-medium">{profile?.displayName || "—"}</p>
              </div>
            </div>

            {profile?.bio && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Bio</p>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground/90">
                  {profile.bio}
                </p>
              </div>
            )}
          </div>
        </Panel>

        {notice && <p className="text-xs text-muted-foreground">{notice}</p>}

        {/* Live account totals */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="panel group flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors group-hover:text-primary">
                <c.icon className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </span>
                <span className="num block text-xl font-semibold tracking-tight">{c.value}</span>
              </span>
            </Link>
          ))}
        </div>

        <Panel
          title="Account security"
          description="Keep an eye on where your account is signed in."
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            <li className="flex items-center gap-3 px-5 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground">
                <Laptop className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Logged-in devices</p>
                <p className="text-[11px] text-muted-foreground">
                  {stats ? `${stats.devices} active session${stats.devices === 1 ? "" : "s"}` : "…"}
                  {" · "}review browsers, locations and revoke anything unfamiliar
                </p>
              </div>
              <Link
                to="/settings"
                className="shrink-0 text-xs text-primary transition-opacity hover:opacity-80"
              >
                Manage →
              </Link>
            </li>
            <li className="flex items-center gap-3 px-5 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Password & security</p>
                <p className="text-[11px] text-muted-foreground">
                  Reset your password and sign out everywhere if your account is ever at risk
                </p>
              </div>
              <Link
                to="/settings"
                className="shrink-0 text-xs text-primary transition-opacity hover:opacity-80"
              >
                Manage →
              </Link>
            </li>
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
