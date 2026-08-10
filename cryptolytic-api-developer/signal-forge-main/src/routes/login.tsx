import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/site/Navbar";
import { MarketBackdrop } from "@/components/site/MarketBackdrop";
import { ApiRequestError, setToken } from "@/lib/api/client";
import { login } from "@/lib/api/indicators";
import { API_CONFIGURED } from "@/lib/api/config";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Cryptolutic API" },
      {
        name: "description",
        content: "Sign in to manage your Cryptolutic indicator API keys, usage and playground requests.",
      },
      { property: "og:title", content: "Sign in — Cryptolutic API" },
      { property: "og:description", content: "Access your Cryptolutic indicator API dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const { token } = await login(email, password);
      setToken(token);
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
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
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
        {!API_CONFIGURED && <ApiNotice />}
      </form>
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
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-16">
      <MarketBackdrop />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="inline-block">
          <Logo />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        <div className="panel mt-7 p-5">{children}</div>
        {footer && <div className="mt-5">{footer}</div>}
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
      No API base URL is configured yet. Set <code className="font-mono">VITE_API_BASE_URL</code> to
      your Indicator API host to enable authentication.
    </p>
  );
}
