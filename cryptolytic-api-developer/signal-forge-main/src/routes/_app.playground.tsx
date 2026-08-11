import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Candle, IndicatorConfig, IndicatorResponse, Timeframe } from "@/types/indicator";
import { TIMEFRAMES } from "@/types/indicator";
import { defaultConfig, requestBytes, validateRequest } from "@/lib/indicators";
import { calculateIndicators } from "@/lib/api/indicators";
import { ApiRequestError } from "@/lib/api/client";
import { API_CONFIGURED } from "@/lib/api/config";
import { LANGUAGES, generateCode, type Language } from "@/lib/codegen";
import { CandleEditor, EXAMPLE_CANDLES } from "@/components/playground/CandleEditor";
import { IndicatorBuilder } from "@/components/playground/IndicatorBuilder";
import { RunStages, RUN_STAGES } from "@/components/playground/RunStages";
import { ResponseVisualization } from "@/components/playground/ResponseVisualization";
import { CodeBlock } from "@/components/common/CodeBlock";
import { EmptyState, Panel } from "@/components/common/primitives";

export const Route = createFileRoute("/_app/playground")({
  head: () => ({
    meta: [
      { title: "API Playground — Cryptolytic API" },
      {
        name: "description",
        content:
          "Build indicator requests, run them against the calculation endpoint and inspect the exact JSON response.",
      },
      { property: "og:title", content: "API Playground — Cryptolytic API" },
      {
        property: "og:description",
        content: "Compose candles and indicators, then run a live calculation request.",
      },
    ],
  }),
  component: PlaygroundPage,
});

function PlaygroundPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState<Timeframe>("4h");
  const [candles, setCandles] = useState<Candle[]>(EXAMPLE_CANDLES);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([
    defaultConfig("ema"),
    defaultConfig("rsi"),
  ]);
  const [language, setLanguage] = useState<Language>("cURL");
  const [stage, setStage] = useState(-1);
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<IndicatorResponse | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const request = useMemo(
    () => ({ symbol, timeframe, candles, indicators }),
    [symbol, timeframe, candles, indicators],
  );
  const issues = useMemo(() => validateRequest(request), [request]);
  const rowErrors = useMemo(
    () =>
      new Set(
        issues
          .filter((issue) => issue.scope === "candles" && issue.row !== undefined)
          .map((i) => i.row as number),
      ),
    [issues],
  );
  const bytes = useMemo(() => requestBytes(request), [request]);

  async function run() {
    if (issues.length > 0) {
      toast.error("Fix the validation issues before running");
      return;
    }
    setRunning(true);
    setError(null);
    setResponse(null);
    setStage(0);
    const ticker = window.setInterval(
      () => setStage((current) => (current < RUN_STAGES.length - 1 ? current + 1 : current)),
      220,
    );
    try {
      const result = await calculateIndicators(request);
      setResponse(result.data);
      setElapsed(result.elapsedMs);
      setStage(RUN_STAGES.length);
      toast.success(`Response received in ${result.elapsedMs} ms`);
    } catch (caught) {
      const apiError =
        caught instanceof ApiRequestError
          ? caught
          : new ApiRequestError({
              status: 0,
              code: "unknown_error",
              message: "The request failed.",
            });
      setError(apiError);
      setStage(-1);
      toast.error(apiError.message);
    } finally {
      window.clearInterval(ticker);
      setRunning(false);
    }
  }

  function reset() {
    setCandles(EXAMPLE_CANDLES);
    setIndicators([defaultConfig("ema"), defaultConfig("rsi")]);
    setResponse(null);
    setError(null);
    setStage(-1);
  }

  return (
    <div className="space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="mono-label">Playground</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">API Playground</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Compose a request, run it against{" "}
            <span className="font-mono text-foreground">/api/v1/indicators/calculate</span> and
            inspect the exact response.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
          <button
            type="button"
            onClick={run}
            disabled={running || issues.length > 0}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Run request
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="symbol" className="mono-label">
                Symbol
              </label>
              <input
                id="symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm focus:border-border-strong focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="timeframe" className="mono-label">
                Timeframe
              </label>
              <select
                id="timeframe"
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value as Timeframe)}
                className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm focus:border-border-strong focus:outline-none"
              >
                {TIMEFRAMES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </Panel>

          <IndicatorBuilder indicators={indicators} onChange={setIndicators} />
          <CandleEditor candles={candles} onChange={setCandles} rowErrors={rowErrors} />

          {issues.length > 0 && (
            <div className="panel border-destructive/40 p-4">
              <p className="mono-label text-destructive">Validation</p>
              <ul className="mt-3 space-y-1.5">
                {issues.slice(0, 8).map((issue, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive"
                      aria-hidden
                    />
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <p className="mono-label">Request preview</p>
              <p className="shrink-0 font-mono text-[11px] text-subtle">
                {(bytes / 1024).toFixed(1)} KB · {candles.length} candles
              </p>
            </div>
            <CodeBlock
              className="mt-3 border-0"
              code={JSON.stringify(request, null, 2)}
              language="json"
              maxHeight="16rem"
            />
          </Panel>

          <Panel className="p-4">
            <p className="mono-label">Code</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LANGUAGES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                    language === value
                      ? "border-border-strong bg-surface-2 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <CodeBlock
              className="mt-3 border-0"
              code={generateCode(language, request)}
              language={language.toLowerCase()}
              maxHeight="18rem"
            />
          </Panel>
        </div>
      </div>

      <section className="space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <p className="mono-label">Response</p>
          {elapsed !== null && response && (
            <p className="shrink-0 font-mono text-[11px] text-subtle">{elapsed} ms</p>
          )}
        </div>

        {(running || response) && <RunStages activeIndex={stage} done={Boolean(response)} />}

        {error && (
          <div className="panel border-destructive/40 p-5">
            <p className="mono-label text-destructive">
              {error.code} {error.status ? `· ${error.status}` : ""}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{error.message}</p>
          </div>
        )}

        {response ? (
          <>
            <ResponseVisualization response={response} />
            <CodeBlock code={JSON.stringify(response, null, 2)} language="json" label="Raw JSON" />
          </>
        ) : (
          !error && (
            <EmptyState
              title="No response yet"
              description={
                API_CONFIGURED
                  ? "Run the request to see the calculated indicator series returned by the API."
                  : "Set VITE_API_BASE_URL to your Indicator API host to run live requests from this playground."
              }
            />
          )
        )}
      </section>
    </div>
  );
}
