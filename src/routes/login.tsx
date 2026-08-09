import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
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
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox id="remember" /> Remember me
          </label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button asChild className="w-full">
          <Link to="/market">Sign in</Link>
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Cryptolytic is an analytics platform. We never execute trades or hold funds.
        </p>
      </form>
    </AuthLayout>
  );
}
