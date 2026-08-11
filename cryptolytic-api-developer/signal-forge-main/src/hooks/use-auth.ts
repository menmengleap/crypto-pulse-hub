import { useCallback, useEffect, useState } from "react";
import { getRefreshToken, getToken, setToken } from "@/lib/api/client";
import { logout } from "@/lib/api/indicators";

export interface AuthState {
  token: string | null;
  ready: boolean;
}

/** Client-side session awareness. The shared backend remains the source of truth. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ token: null, ready: false });

  useEffect(() => {
    const sync = () => setState({ token: getToken(), ready: true });
    sync();
    window.addEventListener("cryptolytic:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cryptolytic:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signOut = useCallback(() => {
    // Revoke the session on the shared backend so the refresh token dies too.
    const refreshToken = getRefreshToken();
    if (refreshToken) void logout(refreshToken).catch(() => {});
    setToken(null);
  }, []);

  return { ...state, isAuthenticated: Boolean(state.token), signOut };
}
