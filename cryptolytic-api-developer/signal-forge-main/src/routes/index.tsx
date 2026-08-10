import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gauge, Layers, ShieldCheck } from "lucide-react";
import { Navbar, Footer } from "@/components/site/Navbar";
import { MarketBackdrop } from "@/components/site/MarketBackdrop";
import { CodeBlock } from "@/components/common/CodeBlock";
import { Panel, Reveal, SectionLabel } from "@/components/common/primitives";
import { INDICATORS } from "@/lib/indicators";
import { ENDPOINTS, LIMITS } from "@/lib/api/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cryptolutic API — Technical Indicator API for developers" },
      {
        name: "description",
        content:
          "Send candles, get precise technical indicators. One stateless endpoint computes SMA, EMA, RSI, MACD, Bollinger Bands, ATR and ADX for bots, dashboards and AI agents.",
      },
      { property: "og:title", content: "Cryptolutic API — Technical Indicator API" },
      {
        property: "og:description",
        content: "One endpoint. Deterministic indicator math for trading bots, dashboards and AI agents.",
      },
    ],
  }),
  component: LandingPage,
});

const SNIPPET = `curl -s https://api.your-host.com${ENDPOINTS.calculate} \\
  -H 'authorization: Bearer YOUR_API_KEY' \\
  -H 'content-type: application/json' \\
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "4h",
    "candles": [ /* your OHLCV series */ ],
    "indicators": [{ "type": "rsi", "params": { "period": 14 } }]
  }'`;

function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        <section className="relative overflow-hidden px-5 pb-24 pt-20 sm:pt-32">
          <MarketBackdrop />
          <div className="relative mx-auto w-full max-w-5xl">
            <SectionLabel>Technical Indicator API</SectionLabel>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Send candles. Get exact indicator math back.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              A single stateless endpoint that computes trend, momentum and volatility indicators for
              trading bots, dashboards, analytics platforms and AI agents.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/playground"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Open the playground
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/docs"
                className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                Read the reference
              </Link>
            </div>

            <Reveal className="mt-16" delay={0.1}>
              <CodeBlock code={SNIPPET} label="POST /api/v1/indicators/calculate" />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-border px-5 py-20">
          <div className="mx-auto w-full max-w-5xl">
            <SectionLabel>Why teams use it</SectionLabel>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: <Gauge className="h-4 w-4" />,
                  title: "Deterministic output",
                  body: "The same candles always return the same series — no smoothing surprises, no hidden data fetches.",
                },
                {
                  icon: <Layers className="h-4 w-4" />,
                  title: "Batch indicators",
                  body: `Compute up to ${LIMITS.maxIndicators} indicators over one candle series in a single round trip.`,
                },
                {
                  icon: <ShieldCheck className="h-4 w-4" />,
                  title: "Strict validation",
                  body: "Timestamps, ranges and parameters are validated before computation, with explicit error codes.",
                },
              ].map((item, index) => (
                <Reveal key={item.title} delay={index * 0.06}>
                  <Panel hover className="h-full p-5">
                    <span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface-2 text-foreground">
                      {item.icon}
                    </span>
                    <h2 className="mt-4 text-sm font-medium">{item.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-5 py-20">
          <div className="mx-auto w-full max-w-5xl">
            <SectionLabel>Supported indicators</SectionLabel>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {INDICATORS.map((indicator, index) => (
                <Reveal key={indicator.type} delay={index * 0.04}>
                  <Panel hover className="h-full p-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="truncate font-mono text-xs uppercase tracking-widest">
                        {indicator.short}
                      </p>
                      <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle">
                        {indicator.category}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-foreground">{indicator.name}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {indicator.description}
                    </p>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border px-5 py-24">
          <div className="mx-auto w-full max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ship indicator logic without maintaining it
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Create an account, generate a key and call the endpoint from any language.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Get API access
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
