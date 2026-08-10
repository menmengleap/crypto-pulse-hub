import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Account registration date (ISO) — used for the "Member since" display. */
  createdAt?: string;
};

export type AuthSession = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

/** The user's profile row from the backend (profiles table). */
export type UserProfile = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
};

type AuthStore = AuthSession & {
  profile: UserProfile | null;
  setSession: (session: AuthSession) => void;
  setProfile: (profile: UserProfile) => void;
  /** Merge a freshly-fetched /api/me response into the store. */
  applyMe: (me: { user: AuthUser; profile: UserProfile }) => void;
  clearSession: () => void;
};

/**
 * Client-side session store. Persisted to localStorage under "cryptolytic-auth"
 * (the persist middleware skips storage during SSR automatically).
 */
export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      profile: null,
      setSession: (session) => set(session),
      setProfile: (profile) => set({ profile }),
      applyMe: ({ user, profile }) => set({ user, profile }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null, profile: null }),
    }),
    { name: "cryptolytic-auth" },
  ),
);

/**
 * True once the persisted session has been fully read from localStorage.
 *
 * zustand's persist middleware hydrates asynchronously (on a microtask after
 * store creation), so on a fresh page load `useAuth((s) => s.accessToken)` is
 * still `null` during the very first render even for signed-in users. Protected
 * routes MUST wait for this flag before deciding to redirect — otherwise the
 * guard bounces to /login, /login sees the (now hydrated) token and bounces
 * straight back: the infinite /login ⇄ /market loop.
 */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuth.persist.hasHydrated());

  useEffect(() => {
    // Sync storage (localStorage) hydrates synchronously once the store is
    // created; still subscribe in case hydration is still pending.
    if (useAuth.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuth.persist.onFinishHydration(() => setHydrated(true));
    // Safety net: if storage is unavailable (blocked/private mode) zustand
    // never hydrates — resolve anyway so the app doesn't hang on a spinner.
    const fallback = window.setTimeout(() => setHydrated(true), 1500);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, []);

  return hydrated;
}
