import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/auth-layout";
import { SocialAuthButtons } from "@/components/layout/social-auth";
import { useAuth } from "@/lib/auth";

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
  const isAuthed = useAuth((s) => s.accessToken !== null);

  // Already signed in? Go straight to the console (or the original target).
  useEffect(() => {
    if (!isAuthed) return;
    const dest = redirect && redirect.startsWith("/") ? redirect : "/market";
    window.location.assign(dest);
  }, [isAuthed, redirect]);

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
