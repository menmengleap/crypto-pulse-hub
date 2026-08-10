import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, User, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/market/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cryptolytic" },
      { name: "description", content: "Manage your profile, avatar and preferences." },
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

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Terminal, profile & preferences">
      <div className="max-w-3xl space-y-4">
        <ProfileSection />
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
