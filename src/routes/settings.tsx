import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Globe,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  User,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, sessionsApi, type DeviceSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { parseUserAgent, type DeviceKind } from "@/lib/device";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cryptolytic" },
      { name: "description", content: "Manage your profile, avatar, preferences and devices." },
    ],
  }),
  component: SettingsPage,
});

/** Client-side avatar pipeline: validate, downscale to a 256px data URL. */
const MAX_AVATAR_BYTES = 2_000_000; // guard matches backend (2MB)

async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Image must be under 2 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported.");
    const dim = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - dim) / 2;
    const sy = (bitmap.height - dim) / 2;
    ctx.drawImage(bitmap, sx, sy, dim, dim, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

function ProfileSection() {
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [preview, setPreview] = useState(profile?.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep local form state in sync when the store hydrates (e.g. on mount).
  useEffect(() => {
    setDisplayName((cur) => cur || profile?.displayName || "");
    setBio((cur) => cur || profile?.bio || "");
    setPreview((cur) => cur || profile?.avatarUrl || "");
  }, [profile?.displayName, profile?.bio, profile?.avatarUrl]);

  const onPick = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(f);
      setPreview(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
    }
  };

  const save = useCallback(async () => {
    const trimmedName = displayName.trim();
    const trimmedBio = bio.trim();
    if (!trimmedName && !trimmedBio && !preview) {
      setError("Nothing to save — fill in at least one field.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      // The form is pre-filled from the store, so an empty value here is an
      // intentional clear.
      const body = {
        displayName: trimmedName,
        bio: trimmedBio,
        avatarUrl: preview,
      };
      const updated = await api.patch<{
        userId: string;
        displayName: string;
        bio: string;
        avatarUrl: string;
      }>("/me/profile", body);
      useAuth.getState().setProfile(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, preview]);

  const initials = ((displayName || user?.email || "??").match(/\b\w/g) ?? [])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Panel title="Profile" description="Name, avatar and bio — stored in your Cryptolytic account.">
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-border bg-surface ring-1 ring-primary/20">
              {preview ? (
                <img src={preview} alt="Profile preview" className="size-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-primary">{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile picture"
              className="absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPick(e.target.files?.[0])}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{displayName || user?.name || "Analyst"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {user?.createdAt
                ? `Member since ${new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}`
                : "Your profile picture is stored securely in your account."}
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user?.name || "Your name"}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-since">Member since</Label>
            <Input
              id="member-since"
              readOnly
              value={
                user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"
              }
              className="bg-muted/40 text-muted-foreground"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short line about you…"
            maxLength={1000}
            rows={3}
          />
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-lg border border-down/25 bg-down/10 px-3 py-2 text-xs text-down">
            <X className="size-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={() => void save()} disabled={saving} className="min-w-28">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
          {saved && (
            <span className={cn("flex items-center gap-1.5 text-xs text-up")}>
              <Check className="size-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}

const deviceIcons: Record<DeviceKind, typeof Monitor> = {
  monitor: Monitor,
  laptop: Laptop,
  smartphone: Smartphone,
  tablet: Tablet,
  unknown: Globe,
};

function fmtDay(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Logged-in devices — active sessions fetched live from the backend's
 * sessions table, with per-device revoke and "sign out all other devices".
 */
function DevicesSection() {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await sessionsApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your devices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await sessionsApi.revoke(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke that device.");
    } finally {
      setBusy(null);
    }
  };

  const revokeOthers = async () => {
    setBusy("all");
    setError(null);
    try {
      await sessionsApi.revokeOthers();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out other devices.");
    } finally {
      setBusy(null);
    }
  };

  const list = sessions ?? [];
  const others = list.filter((s) => !s.current).length;

  return (
    <Panel
      title="Logged-in devices"
      description="Where your account is currently signed in — revoke anything you don't recognise."
      action={
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Refresh devices"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      }
    >
      {loading && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && <p className="px-5 py-6 text-xs text-muted-foreground">{error}</p>}

      {!loading && !error && list.length === 0 && (
        <p className="px-5 py-6 text-center text-xs text-muted-foreground">
          No active sessions found.
        </p>
      )}

      {!loading && !error && list.length > 0 && (
        <ul className="divide-y divide-border">
          {list.map((s) => {
            const info = parseUserAgent(s.userAgent);
            const Icon = deviceIcons[info.kind];
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{info.label}</p>
                    {s.current && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Signed in {fmtDay(s.createdAt)}
                    {s.ip ? ` · ${s.ip}` : ""} · expires {fmtDay(s.expiresAt)}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void revoke(s.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-down/40 hover:text-down disabled:opacity-50"
                  >
                    {busy === s.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <LogOut className="size-3" />
                    )}
                    Revoke
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && others > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-up" />
            {others} other device{others === 1 ? "" : "s"} signed in
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void revokeOthers()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            {busy === "all" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <LogOut className="size-3" />
            )}
            Sign out all other devices
          </button>
        </div>
      )}
    </Panel>
  );
}

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Terminal, profile & preferences">
      <div className="max-w-3xl space-y-4">
        <ProfileSection />
        <DevicesSection />
        <Panel
          title="Coming soon"
          description="Trading view, notifications and workspace preferences ship in an upcoming release."
        >
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="size-4" />
            More settings are on the way.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
