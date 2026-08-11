import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ChevronRight,
  Hash,
  KeyRound,
  Layers,
  Ruler,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import { Navbar, Footer } from "@/components/site/Navbar";
import { CodeBlock } from "@/components/common/CodeBlock";
import { Panel, Reveal, SectionLabel } from "@/components/common/primitives";
import { INDICATORS, type IndicatorMeta } from "@/lib/indicators";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/indicators")({
  head: () => ({
    meta: [
      { title: "Indicators — Cryptolytic API" },
      {
        name: "description",
        content:
          "The Cryptolytic indicator catalog: SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic and OBV — every parameter, formula, output line and warm-up rule, ready to call from one endpoint.",
      },
      { property: "og:title", content: "Indicator catalog — Cryptolytic API" },
      {
        property: "og:description",
        content:
          "Eight technical indicators, one stateless endpoint. Deterministic math for bots, dashboards and AI agents.",
      },
    ],
  }),
  component: IndicatorsPage,
});

type Category = "All" | IndicatorMeta["category"];

const CATEGORIES: { key: Category; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "All", icon: Layers },
  { key: "Trend", icon: TrendingUp },
  { key: "Momentum", icon: Zap },
  { key: "Volatility", icon: Waves },
];

const CATEGORY_ICONS: Record<
  IndicatorMeta["category"],
  React.ComponentType<{ className?: string }>
> = {
  Trend: TrendingUp,
  Momentum: Zap,
  Volatility: Waves,
};

const CATEGORY_INDEX: Record<string, number> = {
  sma: 0,
  ema: 0,
  rsi: 1,
  macd: 1,
  stochastic: 1,
  obv: 1,
  bollinger: 2,
  atr: 2,
};

function specSnippet(indicator: IndicatorMeta): string {
  const spec: Record<string, unknown> = { type: indicator.type };
  if (indicator.params.length > 0) {
    spec["params"] = Object.fromEntries(indicator.params.map((p) => [p.key, p.default]));
  }
  return JSON.stringify(spec, null, 2);
}

const REQUEST = `curl -s https://api.cryptolytic.dev/api/v1/indicators/calculate \\
  -H 'authorization: Bearer cl_live_Ab12Cd…f9zA' \\
  -H 'content-type: application/json' \\
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "4h",
    "candles": [ /* your OHLCV series, ascending */ ],
    "indicators": [
      { "type": "ema", "params": { "period": 21 } },
      { "type": "rsi", "params": { "period": 14 } }
    ]
  }'`;

const RESPONSE = `{
  "symbol": "BTCUSDT",
  "timeframe": "4h",
  "computedAt": "2026-08-11T09:00:00.000Z",
  "results": [
    {
      "type": "ema",
      "params": { "period": 21 },
      "lines": { "ema": [{ "time": 1700000000, "value": 42120.44 }] }
    },
    {
      "type": "rsi",
      "params": { "period": 14 },
      "lines": { "rsi": [{ "time": 1700000000, "value": 58.2 }] }
    }
  ]
}`;

function IndicatorsPage() {
  const [category, setCategory] = useState<Category>("All");
  const [selected, setSelected] = useState<IndicatorMeta | null>(INDICATORS[0] ?? null);

  const visible = useMemo(
    () =>
      category === "All"
        ? INDICATORS
        : INDICATORS.filter((indicator) => indicator.category === category),
    [category],
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="border-b border-border px-5 pb-16 pt-28 sm:pt-36">
          <div className="mx-auto w-full max-w-5xl">
            <SectionLabel>Indicator catalog</SectionLabel>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Eight indicators. One stateless endpoint.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Every technical indicator the engine computes — its parameters, the exact math, the
              lines it returns and the warm-up behaviour you need to expect. Send candles, get
              deterministic series back, every time.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/playground"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Try them in the playground
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/register"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                Get an API key
              </Link>
            </div>

            <div className="mt-14 grid gap-3 sm:grid-cols-3">
              {[
                ["8", "Indicators implemented"],
                ["3", "Families — trend, momentum, volatility"],
                ["1", "Calculate endpoint, up to 12 per request"],
              ].map(([value, label]) => (
                <Panel key={label} className="p-4">
                  <p className="font-mono text-2xl tracking-tight text-foreground">{value}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{label}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] transition-colors",
                      category === key
                        ? "border-border-strong bg-surface-2 text-foreground"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {key}
                    <span className="font-mono text-[10px] text-subtle">
                      {key === "All"
                        ? INDICATORS.length
                        : INDICATORS.filter((i) => i.category === key).length}
                    </span>
                  </button>
                ))}
              </div>
              <p className="font-mono text-[11px] text-subtle">
                catalog also served by{" "}
                <span className="text-muted-foreground">GET /api/v1/indicators</span>
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((indicator, index) => {
                const CategoryIcon = CATEGORY_ICONS[indicator.category];
                const active = selected?.type === indicator.type;
                return (
                  <Reveal key={indicator.type} delay={index * 0.04}>
                    <button
                      type="button"
                      onClick={() => setSelected(indicator)}
                      className={cn(
                        "panel panel-hover group block h-full w-full p-5 text-left",
                        active && "border-border-strong",
                      )}
                      aria-pressed={active}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <p className="truncate font-mono text-xs uppercase tracking-widest text-foreground">
                          {indicator.short}
                        </p>
                        <span className="inline-flex items-center gap-1.5 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle">
                          <CategoryIcon className="h-3 w-3" aria-hidden />
                          {indicator.category}
                        </span>
                      </div>
                      <h2 className="mt-3 text-sm font-medium text-foreground">{indicator.name}</h2>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {indicator.description}
                      </p>
                      <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                          <Hash className="h-3 w-3" aria-hidden />
                          {indicator.params.length > 0
                            ? indicator.params.map((p) => p.key).join(" · ")
                            : "no params"}
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-subtle transition-colors group-hover:text-foreground">
                          {indicator.lines.length} lines
                          <ChevronRight
                            className={cn(
                              "h-3 w-3 transition-transform group-hover:translate-x-0.5",
                              active && "rotate-90",
                            )}
                            aria-hidden
                          />
                        </span>
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>

            {/* Selected detail */}
            <AnimatePresence mode="wait">
              {selected && (
                <motion.div
                  key={selected.type}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-6"
                >
                  <IndicatorDetail indicator={selected} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* How to call */}
        <section className="border-t border-border px-5 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <SectionLabel>Calling the API</SectionLabel>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              One request computes them all
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Batch up to 12 indicators over a single candle series in one round trip. Authenticate
              with the API key you create in the dashboard, or a session token when you are signed
              in. Warm-up values are dropped — every point in the response is meaningful.
            </p>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <CodeBlock code={REQUEST} language="json" label="POST /api/v1/indicators/calculate" />
              <CodeBlock code={RESPONSE} language="json" label="Response" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border px-5 py-20">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border">
            <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
            <div
              className="absolute inset-0 bg-gradient-to-b from-background/60 to-background"
              aria-hidden
            />
            <div className="relative flex flex-col items-center px-6 py-20 text-center sm:py-24">
              <SectionLabel>Technical Indicator API</SectionLabel>
              <h2 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Ship indicator logic without maintaining it
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Create an API key, send your candles, and wire the series straight into your
                dashboard, bot or AI pipeline.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get an API key
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/playground"
                  className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Open the playground
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function IndicatorDetail({ indicator }: { indicator: IndicatorMeta }) {
  const CategoryIcon = CATEGORY_ICONS[indicator.category];
  const tone = CATEGORY_INDEX[indicator.type] ?? 0;

  return (
    <Panel className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left — the math */}
        <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] uppercase tracking-widest",
                tone === 0 && "border-border-strong text-foreground",
                tone === 1 && "border-border text-muted-foreground",
                tone === 2 && "border-border text-muted-foreground",
              )}
            >
              <CategoryIcon className="h-3.5 w-3.5" aria-hidden />
              {indicator.type}
            </span>
            <span className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-subtle">
              {indicator.category}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">{indicator.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {indicator.description}
          </p>

          {indicator.formula && (
            <div className="mt-6">
              <p className="mono-label">Formula</p>
              <p className="mt-2 rounded-md border border-border bg-background/60 px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground/90">
                {indicator.formula}
              </p>
            </div>
          )}

          {indicator.warmup && (
            <div className="mt-6">
              <p className="mono-label">Warm-up</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {indicator.warmup}
              </p>
            </div>
          )}

          <div className="mt-6">
            <p className="mono-label">Output lines</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {indicator.lines.map((line) => (
                <span
                  key={line}
                  className="rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground"
                >
                  {line}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="mono-label">Reading it</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {indicator.interpretation}
            </p>
          </div>
        </div>

        {/* Right — the contract */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="mono-label">Parameters</p>
            <p className="font-mono text-[11px] text-subtle">
              {indicator.params.length === 0 ? "none — fixed math" : "defaults shown"}
            </p>
          </div>

          {indicator.params.length > 0 ? (
            <div className="panel mt-3 divide-y divide-border overflow-hidden">
              {indicator.params.map((param) => (
                <div
                  key={param.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{param.key}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">{param.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-foreground">
                      {formatNumber(param.default)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-subtle">
                      {formatNumber(param.min)} – {formatNumber(param.max)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-border px-4 py-6 text-center">
              <Ruler className="mx-auto h-4 w-4 text-subtle" aria-hidden />
              <p className="mt-2 text-xs text-muted-foreground">
                OBV has no parameters — it derives purely from price and volume.
              </p>
            </div>
          )}

          <p className="mono-label mt-6">Request spec</p>
          <CodeBlock
            className="mt-3"
            code={specSnippet(indicator)}
            language="json"
            maxHeight="10rem"
          />
        </div>
      </div>
    </Panel>
  );
}

function formatNumber(value: number): string {
  return String(value);
}
