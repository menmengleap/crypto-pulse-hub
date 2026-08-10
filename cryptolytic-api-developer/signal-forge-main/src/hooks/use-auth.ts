import { useCallback, useEffect, useState } from "react";
import { getToken, setToken } from "@/lib/api/client";

export interface AuthState {
  token: string | null;
  ready: boolean;
}

/** Client-side session awareness. The backend remains the source of truth. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ token: null, ready: false });

  useEffect(() => {
    const sync = () => setState({ token: getToken(), ready: true });
    sync();
    window.addEventListener("cryptolutic:auth", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cryptolutic:auth", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signOut = useCallback(() => setToken(null), []);

  return { ...state, isAuthenticated: Boolean(state.token), signOut };
}
