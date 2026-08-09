import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Cryptolytic" },
      { name: "description", content: "Create a free Cryptolytic account for crypto market analytics and research." },
      { property: "og:title", content: "Create account — Cryptolytic" },
      { property: "og:description", content: "Start analysing crypto markets with charts, sentiment and AI research." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
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
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first">First name</Label>
            <Input id="first" placeholder="Alex" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last">Last name</Label>
            <Input id="last" placeholder="Kim" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="At least 8 characters" />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox id="terms" className="mt-0.5" />
          <span>I agree to the terms of service and understand this platform provides analysis, not investment advice.</span>
        </label>
        <Button asChild className="w-full">
          <Link to="/market">Create account</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
