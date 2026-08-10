import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/auth-layout";
import { SocialAuthButtons } from "@/components/layout/social-auth";
import { useAuth } from "@/lib/auth";

const loginSearch = z.object({
  /** Where to return after signing in (console pages pass their path). */
  redirect: z.string().optional(),
  /** OAuth failure message (from the backend callback). */
  error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearch,
  head: () => ({
    meta: [
      { title: "Sign in — Cryptolytic" },
      { name: "description", content: "Sign in to your Cryptolytic market analytics workspace." },
      { property: "og:title", content: "Sign in — Cryptolytic" },
      { property: "og:description", content: "Access your crypto market intelligence dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, error } = Route.useSearch();
  const isAuthed = useAuth((s) => s.accessToken !== null);

  // Already signed in? Go straight to the console (or the original target).
  // replace() keeps /login out of the back stack so the back button can't
  // bounce the user into a redirect loop.
  useEffect(() => {
    if (!isAuthed) return;
    const dest = redirect && redirect.startsWith("/") ? redirect : "/market";
    window.location.replace(dest);
  }, [isAuthed, redirect]);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your market intelligence workspace."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-down/25 bg-down/10 px-3 py-2 text-xs text-down">
            {error}
          </p>
        )}
        <SocialAuthButtons mode="login" redirect={redirect} />
        <p className="text-center text-[11px] text-muted-foreground">
          Cryptolytic is an analytics platform. We never execute trades or hold funds.
        </p>
      </div>
    </AuthLayout>
  );
}
