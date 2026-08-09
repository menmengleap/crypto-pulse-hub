import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AuthSession = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

type AuthStore = AuthSession & {
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

/**
 * Client-side session store. Persisted to localStorage under "cryptolytic-auth"
 * (the persist middleware skips storage during SSR automatically), so the
 * console guard can read it on first render.
 */
export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (session) => set(session),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "cryptolytic-auth" },
  ),
);
