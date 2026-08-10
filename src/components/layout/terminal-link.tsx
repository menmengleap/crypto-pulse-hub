import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useSessionGate } from "@/lib/api";
import { useAuth, useAuthHydrated } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * The single console entry point ("Open terminal") for the marketing pages.
 *
 * Routes by session state:
 *   - authenticated → the console destination (`to`), so a signed-in user goes
 *     straight to the terminal
 *   - signed out    → /register?redirect=<to> — visitors must create an
 *     account first, and after signing up they land on the exact console page
 *     they clicked
 *
 * The gate is only *blocking* while a stored token is being validated against
 * /api/me (hydration + one cached check). Visitors with no session at all are
 * immediately, fully clickable — no disabled flash on first paint.
 */
export function TerminalLink({
  to,
  className,
  children = "Open terminal",
  onClick,
}: {
  /** Console destination when the visitor is authenticated. */
  to: string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  const hydrated = useAuthHydrated();
  const accessToken = useAuth((s) => s.accessToken);
  const { loading, authed } = useSessionGate();

  // "Definitely signed out": the persisted session has been read and there is
  // no token at all. These users never need validation — the link is live to
  // /register immediately. Everyone else (a token being checked, or hydration
  // still in flight) stays inert until the gate resolves, so a signed-in user
  // can never be bounced into /register mid-validation.
  const definitelySignedOut = hydrated && !accessToken;
  const blocked = loading && !definitelySignedOut;

  return (
    <Link
      to={authed ? to : "/register"}
      {...(!authed ? { search: { redirect: to } } : {})}
      onClick={(e) => {
        if (blocked) e.preventDefault();
        onClick?.();
      }}
      aria-disabled={blocked}
      className={cn(className, blocked && "pointer-events-none opacity-60")}
    >
      {children}
    </Link>
  );
}
