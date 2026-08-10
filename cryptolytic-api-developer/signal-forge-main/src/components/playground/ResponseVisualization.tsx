import { lazy, Suspense } from "react";
import type { IndicatorResponse, IndicatorResult } from "@/types/indicator";
import { INDICATOR_MAP } from "@/lib/indicators";
import { Skeleton } from "@/components/common/primitives";

const LineChartPanel = lazy(() => import("./LineChartPanel"));

function formatValue(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : 4;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Renders only values present in the API response. Nothing is generated locally. */
export function ResponseVisualization({ response }: { response: IndicatorResponse }) {
  if (!response.results?.length) {
    return (
      <p className="panel px-4 py-8 text-center text-sm text-muted-foreground">
        The response contained no indicator results.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {response.results.map((result, index) => (
        <ResultPanel key={`${result.type}-${index}`} result={result} />
      ))}
    </div>
  );
}

function ResultPanel({ result }: { result: IndicatorResult }) {
  const meta = INDICATOR_MAP[result.type];
  const lineNames = Object.keys(result.lines ?? {});
  const chartable = lineNames.filter((name) => (result.lines[name]?.length ?? 0) >= 2);

  return (
    <section className="panel overflow-hidden">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs uppercase tracking-widest text-foreground">
            {meta?.short ?? result.type}
          </p>
          <p className="mt-0.5 truncate text-xs text-subtle">{meta?.name ?? "Indicator result"}</p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-subtle">
          {Object.entries(result.params ?? {})
            .map(([key, value]) => `${key}=${value}`)
            .join(" · ")}
        </p>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {lineNames.map((name) => {
          const series = result.lines[name] ?? [];
          const latest = series[series.length - 1];
          return (
            <div key={name} className="rounded-lg border border-border bg-surface-2 px-3 py-3">
              <p className="mono-label">{name}</p>
              <p className="mt-2 font-mono text-lg text-foreground">
                {latest ? formatValue(latest.value) : "—"}
              </p>
              <p className="mt-1 text-[11px] text-subtle">{series.length} points</p>
            </div>
          );
        })}
      </div>

      {chartable.length > 0 && (
        <div className="border-t border-border p-4">
          <Suspense fallback={<Skeleton className="h-56 w-full" />}>
            <LineChartPanel lines={result.lines} names={chartable} />
          </Suspense>
        </div>
      )}
    </section>
  );
}
