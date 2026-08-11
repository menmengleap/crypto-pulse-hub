import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/site/Navbar";
import { GithubAuthButton } from "@/components/auth/github-button";
import { ApiRequestError } from "@/lib/api/client";
import { login } from "@/lib/api/indicators";
import { AUTH_EXPLICIT } from "@/lib/api/config";
import cryptoVideo from "@/video/crypto.mp4";

const loginSearch = z.object({
  /** Error message from the OAuth callback (e.g. "Sign-in failed"). */
  error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearch,
  head: () => ({
    meta: [
      { title: "Sign in — Cryptolytic API" },
      {
        name: "description",
        content:
          "Sign in to manage your Cryptolytic indicator API keys, usage and playground requests.",
      },
      { property: "og:title", content: "Sign in — Cryptolytic API" },
      { property: "og:description", content: "Access your Cryptolytic indicator API dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { error } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  // Surface OAuth failures (the backend redirects back here with ?error=...).
  useEffect(() => {
    if (error) {
      toast.error(error);
      // Drop the error from the URL so a refresh doesn't re-toast it.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [error]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      // login() persists the session (access + refresh token) itself.
      await login(email, password);
      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Sign in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your indicator API dashboard, keys and usage."
      footer={
        <p className="text-sm text-muted-foreground">
          No account yet?{" "}
          <Link to="/register" className="text-foreground underline underline-offset-4">
            Create one
          </Link>{" "}
          or{" "}
          <Link to="/" className="text-foreground underline underline-offset-4">
            Back
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <GithubAuthButton mode="login" />
        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-widest text-subtle">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Sign in
            {!pending && <ArrowRight className="h-4 w-4" aria-hidden />}
          </button>
        </form>
        {!AUTH_EXPLICIT && <ApiNotice />}
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Respect prefers-reduced-motion: pause the background video and only
  // resume when the user opts back into motion.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (media.matches) video.pause();
      else void video.play().catch(() => {});
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-hidden lg:flex-row">
      {/* Left — video */}
      <div className="relative h-44 shrink-0 overflow-hidden sm:h-56 lg:h-auto lg:w-1/2">
        <video
          ref={(element) => {
            // Autoplay requires the muted property, not just the attribute.
            videoRef.current = element;
            if (element) element.muted = true;
          }}
          src={cryptoVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent lg:bg-none"
          aria-hidden
        />
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="panel mt-7 p-5">{children}</div>
          {footer && <div className="mt-5">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mono-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-border-strong focus:outline-none"
      />
    </div>
  );
}

export function ApiNotice() {
  return (
    <p className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
      No shared auth backend is configured yet. Set{" "}
      <code className="font-mono">VITE_AUTH_API_BASE_URL</code> to your Crypto Pulse Hub API host to
      enable authentication.
    </p>
  );
}
