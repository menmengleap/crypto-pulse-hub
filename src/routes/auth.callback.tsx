import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { api, type MeResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const callbackSearch = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: callbackSearch,
  head: () => ({
    meta: [{ title: "Signing you in — Cryptolytic" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { accessToken, refreshToken, error } = Route.useSearch();
  const setSession = useAuth((s) => s.setSession);

  useEffect(() => {
    if (accessToken && refreshToken) {
      setSession({ user: null, accessToken, refreshToken });

      // Hydrate the user in the background — never blocks the redirect.
      void api
        .get<MeResponse>("/me")
        .then((me) => setSession({ user: me.user, accessToken, refreshToken }))
        .catch(() => {});

      const dest = sessionStorage.getItem("auth_redirect");
      sessionStorage.removeItem("auth_redirect");
      // replace() so the /auth/callback entry doesn't stay in the back stack.
      window.location.replace(dest && dest.startsWith("/") ? dest : "/market");
      return;
    }

    // No tokens — the OAuth flow failed or was interrupted.
    window.location.replace(
      "/login?error=" + encodeURIComponent(error ?? "Sign-in failed. Please try again."),
    );
  }, [accessToken, refreshToken, error, setSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        Signing you in…
      </div>
    </div>
  );
}
