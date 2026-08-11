import { createFileRoute } from "@tanstack/react-router";
import { Navbar, Footer } from "@/components/site/Navbar";
import { CodeBlock } from "@/components/common/CodeBlock";
import { Panel, SectionLabel } from "@/components/common/primitives";
import { INDICATORS } from "@/lib/indicators";
import { ENDPOINTS, LIMITS } from "@/lib/api/config";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "API Reference — Cryptolytic API" },
      {
        name: "description",
        content:
          "Reference for the Cryptolytic indicator API: authentication, the calculate endpoint, request limits, errors and supported indicators.",
      },
      { property: "og:title", content: "API Reference — Cryptolytic API" },
      {
        property: "og:description",
        content: "Authentication, endpoints, limits and error codes for the indicator engine.",
      },
    ],
  }),
  component: DocsPage,
});

const REQUEST_EXAMPLE = `POST ${ENDPOINTS.calculate}
authorization: Bearer YOUR_API_KEY
content-type: application/json

{
  "symbol": "BTCUSDT",
  "timeframe": "4h",
  "candles": [
    { "time": 1700000000, "open": 42000, "high": 42500, "low": 41800, "close": 42300, "volume": 1200.5 }
  ],
  "indicators": [
    { "type": "ema", "params": { "period": 21 } },
    { "type": "rsi", "params": { "period": 14 } }
  ]
}`;

const RESPONSE_EXAMPLE = `{
  "symbol": "BTCUSDT",
  "timeframe": "4h",
  "computedAt": "2024-01-01T00:00:00.000Z",
  "results": [
    {
      "type": "ema",
      "params": { "period": 21 },
      "lines": { "ema": [{ "time": 1700000000, "value": 42120.44 }] }
    }
  ]
}`;

const ERRORS = [
  ["400", "bad_request", "The body could not be parsed as JSON."],
  ["401", "unauthorized", "Missing or invalid API key."],
  ["413", "payload_too_large", "The request body exceeded 2 MB."],
  ["422", "validation_error", "Candles or indicator params failed validation."],
  ["429", "rate_limited", "The plan rate limit was exceeded."],
  ["500", "internal_server_error", "Unexpected failure while computing indicators."],
];

function DocsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:py-24">
        <SectionLabel>Reference</SectionLabel>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">API Reference</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          One endpoint computes every supported indicator for a candle series you send. The API is
          stateless: it never fetches market data on your behalf.
        </p>

        <section className="mt-14 space-y-4">
          <h2 className="text-lg font-medium">Authentication</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Send your key as a bearer token on every request. Keys are created and revoked from the
            dashboard.
          </p>
          <CodeBlock code={`authorization: Bearer YOUR_API_KEY`} label="Header" />
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-lg font-medium">Calculate indicators</h2>
          <CodeBlock code={REQUEST_EXAMPLE} language="json" label="Request" />
          <CodeBlock code={RESPONSE_EXAMPLE} language="json" label="Response" />
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-lg font-medium">Limits</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Candles per request", `${LIMITS.minCandles} – ${LIMITS.maxCandles}`],
              ["Indicators per request", `1 – ${LIMITS.maxIndicators}`],
              ["Max body size", "2 MB"],
              ["Timestamps", "Strictly ascending, unique"],
            ].map(([label, value]) => (
              <Panel key={label} className="p-4">
                <p className="mono-label">{label}</p>
                <p className="mt-2 font-mono text-sm text-foreground">{value}</p>
              </Panel>
            ))}
          </div>
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-lg font-medium">Errors</h2>
          <div className="panel divide-y divide-border overflow-hidden">
            {ERRORS.map(([status, code, description]) => (
              <div
                key={code}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[4rem_10rem_minmax(0,1fr)]"
              >
                <p className="font-mono text-xs text-foreground">{status}</p>
                <p className="font-mono text-xs text-muted-foreground">{code}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-lg font-medium">Supported indicators</h2>
          <div className="panel divide-y divide-border overflow-hidden">
            {INDICATORS.map((indicator) => (
              <div key={indicator.type} className="px-4 py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <p className="truncate text-sm text-foreground">
                    {indicator.name}{" "}
                    <span className="font-mono text-xs text-subtle">({indicator.type})</span>
                  </p>
                  <p className="shrink-0 font-mono text-[11px] text-subtle">
                    {indicator.params.map((param) => param.key).join(", ")}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {indicator.interpretation}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
