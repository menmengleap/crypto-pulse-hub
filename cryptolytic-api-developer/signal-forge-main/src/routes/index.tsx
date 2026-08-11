import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gauge, Layers, ShieldCheck } from "lucide-react";
import { Navbar, Footer } from "@/components/site/Navbar";
import { CodeBlock } from "@/components/common/CodeBlock";
import { Panel, Reveal, SectionLabel } from "@/components/common/primitives";
import { TestimonialsSection } from "@/components/blocks/testimonials-with-marquee";
import { INDICATORS } from "@/lib/indicators";
import { ENDPOINTS, LIMITS } from "@/lib/api/config";
import featureVideo from "@/video/feature.mp4";
import spaceVideo from "@/video/space.mp4";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cryptolytic API — Technical Indicator API for developers" },
      {
        name: "description",
        content:
          "Send candles, get precise technical indicators. One stateless endpoint computes SMA, EMA, RSI, MACD, Bollinger Bands, ATR and ADX for bots, dashboards and AI agents.",
      },
      { property: "og:title", content: "Cryptolytic API — Technical Indicator API" },
      {
        property: "og:description",
        content:
          "One endpoint. Deterministic indicator math for trading bots, dashboards and AI agents.",
      },
    ],
  }),
  component: LandingPage,
});

const TESTIMONIALS = [
  {
    author: {
      name: "Emma Thompson",
      handle: "@emmaai",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    },
    text: "We replaced our in-house indicator code with this API in a day. Deterministic RSI and MACD series with zero maintenance.",
    href: "https://twitter.com/emmaai",
  },
  {
    author: {
      name: "David Park",
      handle: "@davidtech",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    text: "The API integration is flawless. We cut our dashboard development time by 60% since wiring it up.",
    href: "https://twitter.com/davidtech",
  },
  {
    author: {
      name: "Sofia Rodriguez",
      handle: "@sofiaml",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    },
    text: "Finally an indicator engine that just works — consistent output, strict validation and clear error codes.",
  },
];

const SNIPPET = `curl -s https://api.your-host.com${ENDPOINTS.calculate} \
  -H 'authorization: Bearer YOUR_API_KEY' \
  -H 'content-type: application/json' \
  -d '{
    "symbol": "BTCUSDT",
    "timeframe": "4h",
    "candles": [ /* your OHLCV series */ ],
    "indicators": [{ "type": "rsi", "params": { "period": 14 } }]
  }'`;

function LandingPage() {
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const ctaVideoRef = useRef<HTMLVideoElement>(null);

  // Respect prefers-reduced-motion: pause the background videos and only
  // resume when the user opts back into motion.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      for (const video of [heroVideoRef.current, ctaVideoRef.current]) {
        if (!video) continue;
        if (media.matches) video.pause();
        else void video.play().catch(() => {});
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        <section className="relative flex min-h-screen items-center overflow-hidden px-5 pb-24 pt-24 sm:pt-28">
          {/* Full first-screen background video — displayed at its native size,
              never resized or cropped. */}
          <video
            ref={(element) => {
              // Autoplay requires the muted property, not just the attribute.
              heroVideoRef.current = element;
              if (element) element.muted = true;
            }}
            src={featureVideo}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            className="absolute left-1/2 top-1/2 h-auto w-auto -translate-x-1/2 -translate-y-1/2"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/40 to-background"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-5xl">
            <SectionLabel>Technical Indicator API</SectionLabel>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Send candles. Get exact indicator math back.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              A single stateless endpoint that computes trend, momentum and volatility indicators
              for trading bots, dashboards, analytics platforms and AI agents.
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
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
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

        <div className="border-t border-border">
          <TestimonialsSection
            title="Trusted by developers worldwide"
            description="Join thousands of developers shipping indicator math without maintaining it."
            testimonials={TESTIMONIALS}
          />
        </div>

        <section className="border-t border-border px-5 py-20">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-black shadow-[0_0_120px_-24px_rgba(0,0,0,0.9)]">
            <video
              ref={(element) => {
                // Autoplay requires the muted property, not just the attribute.
                ctaVideoRef.current = element;
                if (element) element.muted = true;
              }}
              src={spaceVideo}
              autoPlay
              muted
              loop
              playsInline
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/45 to-background/95"
              aria-hidden
            />

            <div className="relative flex min-h-[65vh] flex-col items-center justify-center px-6 py-24 text-center sm:min-h-[80vh]">
              <SectionLabel>Technical Indicator API</SectionLabel>
              <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Ship indicator logic without maintaining it
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                A single stateless endpoint that computes trend, momentum and volatility indicators
                for trading bots, dashboards, analytics platforms and AI agents.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get API
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Sign In
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
