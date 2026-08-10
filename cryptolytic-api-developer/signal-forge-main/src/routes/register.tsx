import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthLayout, Field, ApiNotice } from "./login";
import { ApiRequestError, setToken } from "@/lib/api/client";
import { register as registerAccount } from "@/lib/api/indicators";
import { API_CONFIGURED } from "@/lib/api/config";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — Cryptolutic API" },
      {
        name: "description",
        content: "Create a Cryptolutic account to generate indicator API keys and run live calculations.",
      },
      { property: "og:title", content: "Create an account — Cryptolutic API" },
      { property: "og:description", content: "Get API keys for the Cryptolutic indicator engine." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await registerAccount(email, password, name);
      if (result.token) {
        setToken(result.token);
        toast.success("Account created");
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Account created — you can sign in now");
        navigate({ to: "/login" });
      }
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "Sign up failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Generate API keys and start calling the indicator engine."
      footer={
        <p className="text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" value={name} onChange={setName} autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Create account
          {!pending && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
        {!API_CONFIGURED && <ApiNotice />}
      </form>
    </AuthLayout>
  );
}
