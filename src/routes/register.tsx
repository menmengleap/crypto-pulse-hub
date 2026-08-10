import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/auth-layout";
import { SocialAuthButtons } from "@/components/layout/social-auth";
import { useSessionGate } from "@/lib/api";

const registerSearch = z.object({
  /** Where to return after signing up. */
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: registerSearch,
  head: () => ({
    meta: [
      { title: "Create account — Cryptolytic" },
      {
        name: "description",
        content: "Create a free Cryptolytic account for crypto market analytics and research.",
      },
      { property: "og:title", content: "Create account — Cryptolytic" },
      {
        property: "og:description",
        content: "Start analysing crypto markets with charts, sentiment and AI research.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  const { loading, authed } = useSessionGate();

  // Already signed in with a *validated* session? Go straight to the console
  // (or the original target). The gate waits for hydration + /api/me before
  // deciding, so a stale token in localStorage is purged here instead of
  // bouncing /register → /market → /login forever. replace() keeps /register
  // out of the back stack so the back button can't re-enter the loop.
  useEffect(() => {
    if (loading) return;
    if (!authed) return;
    const dest = redirect && redirect.startsWith("/") ? redirect : "/market";
    window.location.replace(dest);
  }, [loading, authed, redirect]);

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Free to start. No trading account required."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <SocialAuthButtons mode="register" redirect={redirect} />
        <p className="text-center text-[11px] text-muted-foreground">
          No card required. Cryptolytic provides analysis only — we never execute trades or hold
          funds.
        </p>
      </div>
    </AuthLayout>
  );
}
