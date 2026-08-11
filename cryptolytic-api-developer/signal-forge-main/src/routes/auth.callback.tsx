import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { setSession } from "@/lib/api/client";

const callbackSearch = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: callbackSearch,
  head: () => ({
    meta: [{ title: "Signing you in — Cryptolytic API" }],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { accessToken, refreshToken, error } = Route.useSearch();

  useEffect(() => {
    if (accessToken && refreshToken) {
      // Persist the session (access + refresh token) exactly like email login.
      setSession({ accessToken, refreshToken });
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    // No tokens — the OAuth flow failed or was interrupted.
    navigate({
      to: "/login",
      replace: true,
      search: { error: error ?? "Sign-in failed. Please try again." },
    });
  }, [accessToken, refreshToken, error, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        Signing you in…
      </div>
    </div>
  );
}
