import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, KeyRound, Terminal } from "lucide-react";
import { StatCard, EmptyState, Panel } from "@/components/common/primitives";
import { fetchApiKeys, fetchUsage } from "@/lib/api/indicators";
import { API_CONFIGURED } from "@/lib/api/config";
import { ApiRequestError } from "@/lib/api/client";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Cryptolutic API" },
      {
        name: "description",
        content: "Monitor your Cryptolutic indicator API requests, success rate, latency and active keys.",
      },
      { property: "og:title", content: "Overview — Cryptolutic API" },
      { property: "og:description", content: "Monitor your indicator API activity." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const usage = useQuery({
    queryKey: ["usage", "24h"],
    queryFn: () => fetchUsage("24h"),
    enabled: API_CONFIGURED,
    retry: false,
  });
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
    enabled: API_CONFIGURED,
    retry: false,
  });

  const stats = usage.data;
  const successRate =
    stats && stats.totalRequests > 0
      ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`
      : null;
  const activeKeys =
    stats?.activeKeys ?? keys.data?.filter((key) => key.status === "active").length ?? null;

  const unavailable = !API_CONFIGURED || usage.isError;

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label">Dashboard</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Monitor your Indicator API activity.</p>
      </header>

      {unavailable ? (
        <EmptyState
          icon={<AlertTriangle className="h-4 w-4" />}
          title="No usage data available"
          description={
            !API_CONFIGURED
              ? "Set VITE_API_BASE_URL to your Indicator API host, then sign in to start monitoring requests."
              : usage.error instanceof ApiRequestError
                ? usage.error.message
                : "Connect your API to start monitoring requests."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="API requests"
            value={stats ? stats.totalRequests.toLocaleString("en-US") : null}
            hint="Last 24 hours"
            loading={usage.isLoading}
          />
          <StatCard label="Success rate" value={successRate} hint="Reported by the API" loading={usage.isLoading} />
          <StatCard
            label="Avg latency"
            value={stats?.avgLatencyMs ? `${Math.round(stats.avgLatencyMs)} ms` : null}
            hint="Server-side processing"
            loading={usage.isLoading}
          />
          <StatCard
            label="Active API keys"
            value={activeKeys !== null ? String(activeKeys) : null}
            hint="Currently usable"
            loading={usage.isLoading || keys.isLoading}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCard
          to="/playground"
          icon={<Terminal className="h-4 w-4" />}
          title="Open API Playground"
          description="Build a request, run it against the calculation endpoint and inspect the JSON response."
        />
        <ActionCard
          to="/api-keys"
          icon={<KeyRound className="h-4 w-4" />}
          title="Manage API keys"
          description="Create, inspect and revoke the credentials your applications use."
        />
      </div>

      <Panel className="p-5">
        <p className="mono-label">Endpoint</p>
        <p className="mt-3 font-mono text-sm text-foreground">
          POST <span className="text-muted-foreground">/api/v1/indicators/calculate</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          One endpoint computes every supported indicator for a candle series.{" "}
          <Link to="/docs" className="text-foreground underline underline-offset-4">
            Read the reference
          </Link>
          .
        </p>
      </Panel>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="panel panel-hover group block p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-foreground">
          {icon}
        </span>
        <span className="min-w-0 truncate text-sm font-medium">{title}</span>
        <ArrowRight
          className="ml-auto h-4 w-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}
