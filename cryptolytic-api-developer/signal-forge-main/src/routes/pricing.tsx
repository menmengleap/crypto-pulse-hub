import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, ChevronDown, KeyRound, Sparkles } from "lucide-react";
import { Navbar, Footer } from "@/components/site/Navbar";
import { Panel, Reveal, SectionLabel } from "@/components/common/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Cryptolytic API" },
      {
        name: "description",
        content:
          "Simple, request-based pricing for the Cryptolytic indicator API. Start free with 5,000 requests a month, scale with Pro or go custom with Enterprise.",
      },
      { property: "og:title", content: "Pricing — Cryptolytic API" },
      {
        property: "og:description",
        content: "Free to start, request-based pricing. All eight indicators on every plan.",
      },
    ],
  }),
  component: PricingPage,
});

type Cycle = "monthly" | "yearly";

interface Tier {
  name: string;
  tagline: string;
  monthly: number | null;
  yearly: number | null;
  cta: { label: string; to: string };
  featured?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    name: "Hobby",
    tagline: "For side projects and trying the engine.",
    monthly: 0,
    yearly: 0,
    cta: { label: "Start for free", to: "/register" },
    features: [
      "5,000 requests / month",
      "1 API key",
      "All 8 indicators",
      "Up to 12 indicators per request",
      "20 req / min rate limit",
      "Community support",
    ],
  },
  {
    name: "Pro",
    tagline: "For production bots and dashboards.",
    monthly: 29,
    yearly: 24,
    featured: true,
    cta: { label: "Get API key", to: "/register" },
    features: [
      "250,000 requests / month",
      "10 API keys",
      "All 8 indicators + batches",
      "Up to 12 indicators per request",
      "120 req / min rate limit",
      "Usage analytics & per-key logs",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For platforms serving many customers.",
    monthly: null,
    yearly: null,
    cta: { label: "Talk to us", to: "/register" },
    features: [
      "Unlimited requests",
      "Unlimited API keys",
      "Custom rate limits & SLA (99.9%)",
      "SSO / team access",
      "Dedicated support engineer",
      "Private instance (optional)",
    ],
  },
];

const COMPARISON: {
  feature: string;
  hobby: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}[] = [
  { feature: "Requests per month", hobby: "5,000", pro: "250,000", enterprise: "Unlimited" },
  { feature: "API keys", hobby: "1", pro: "10", enterprise: "Unlimited" },
  {
    feature: "Indicators (SMA, EMA, RSI, MACD, Bollinger, ATR, Stoch, OBV)",
    hobby: true,
    pro: true,
    enterprise: true,
  },
  { feature: "Indicators per request", hobby: "12", pro: "12", enterprise: "12" },
  { feature: "Rate limit", hobby: "20 req/min", pro: "120 req/min", enterprise: "Custom" },
  { feature: "Usage analytics & per-key logs", hobby: false, pro: true, enterprise: true },
  { feature: "Playground & code generation", hobby: true, pro: true, enterprise: true },
  { feature: "Priority support", hobby: false, pro: true, enterprise: true },
  { feature: "SLA & dedicated engineer", hobby: false, pro: false, enterprise: true },
];

const FAQS = [
  {
    q: "How do request limits work?",
    a: "Every calculation you run against POST /api/v1/indicators/calculate counts as one request, regardless of how many indicators are in the batch. Your monthly quota resets on the first of each month, and the dashboard shows live usage per key.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. The API is stateless — you send OHLCV candles and receive computed series back as JSON. There are no libraries to install or versions to pin; any HTTP client works.",
  },
  {
    q: "Which indicators are included?",
    a: "All of them, on every plan: SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Stochastic and On-Balance Volume. Plans differ only in volume, rate limits and support — never in indicator access.",
  },
  {
    q: "Can I upgrade, downgrade or cancel anytime?",
    a: "Yes. Plans are self-serve and prorated. Downgrading never removes historical usage logs, and your API keys keep working until the end of the billing period.",
  },
  {
    q: "Is there a free tier for testing?",
    a: "Hobby is free forever — 5,000 requests a month and one API key. It's enough for a personal bot or a dashboard in development.",
  },
  {
    q: "What counts as an Enterprise request?",
    a: "Enterprise is a custom agreement, so we scope volume, rate limits and SLAs around your platform's actual traffic. Talk to us and we'll size a plan that fits.",
  },
];

function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="border-b border-border px-5 pb-16 pt-28 sm:pt-36">
          <div className="mx-auto w-full max-w-4xl text-center">
            <SectionLabel>Pricing</SectionLabel>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Start free. Scale when you ship.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Every plan includes all eight indicators and the same stateless endpoint. You pay for
              volume, not features.
            </p>

            <div className="mt-9 inline-flex items-center gap-1 rounded-md border border-border p-1">
              {(["monthly", "yearly"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCycle(value)}
                  className={cn(
                    "rounded px-4 py-1.5 text-[13px] capitalize transition-colors",
                    cycle === value
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value}
                  {value === "yearly" && (
                    <span className="ml-2 font-mono text-[10px] text-subtle">−20%</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-4 lg:grid-cols-3">
              {TIERS.map((tier, index) => {
                const price = cycle === "monthly" ? tier.monthly : tier.yearly;
                return (
                  <Reveal key={tier.name} delay={index * 0.07}>
                    <div
                      className={cn(
                        "panel relative flex h-full flex-col p-6",
                        tier.featured && "border-border-strong shadow-elevated",
                      )}
                    >
                      {tier.featured && (
                        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-strong bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground">
                          <Sparkles className="h-3 w-3" aria-hidden />
                          Most popular
                        </span>
                      )}
                      <h2 className="text-sm font-semibold tracking-tight">{tier.name}</h2>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {tier.tagline}
                      </p>
                      <div className="mt-6 flex items-baseline gap-1.5">
                        {price === null ? (
                          <p className="font-mono text-3xl tracking-tight text-foreground">
                            Custom
                          </p>
                        ) : (
                          <>
                            <p className="font-mono text-3xl tracking-tight text-foreground">
                              ${price}
                            </p>
                            <p className="text-xs text-subtle">/ month</p>
                          </>
                        )}
                      </div>
                      {price !== null && price > 0 && (
                        <p className="mt-1 text-[11px] text-subtle">
                          {cycle === "yearly" && tier.yearly !== null
                            ? `billed yearly — ${tier.yearly * 12} / year`
                            : "billed monthly"}
                        </p>
                      )}
                      {price === 0 && (
                        <p className="mt-1 text-[11px] text-subtle">free forever, no card needed</p>
                      )}
                      <ul className="mt-7 flex-1 space-y-2.5">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-[13px]">
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                              aria-hidden
                            />
                            <span className="leading-snug text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to={tier.cta.to}
                        className={cn(
                          "mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]",
                          tier.featured
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-foreground hover:border-border-strong",
                        )}
                      >
                        {tier.cta.label}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <p className="mt-6 text-center text-xs text-subtle">
              Billing is on the way — every tier is currently free to try. Create your key and start
              building today.
            </p>
          </div>
        </section>

        {/* Comparison */}
        <section className="border-t border-border px-5 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-5xl">
            <SectionLabel>Compare plans</SectionLabel>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything, in one table
            </h2>
            <div className="panel mt-8 overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="px-4 py-3.5 text-xs font-medium text-foreground">
                      Feature
                    </th>
                    {["Hobby", "Pro", "Enterprise"].map((name) => (
                      <th key={name} scope="col" className="px-4 py-3.5 text-right">
                        <span className="font-mono text-xs uppercase tracking-widest text-foreground">
                          {name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {COMPARISON.map((row) => (
                    <tr key={row.feature}>
                      <td className="px-4 py-3.5 text-[13px] text-muted-foreground">
                        {row.feature}
                      </td>
                      {([row.hobby, row.pro, row.enterprise] as (string | boolean)[]).map(
                        (value, i) => (
                          <td key={i} className="px-4 py-3.5 text-right">
                            {typeof value === "boolean" ? (
                              value ? (
                                <Check
                                  className="ml-auto h-4 w-4 text-success"
                                  aria-label="Included"
                                />
                              ) : (
                                <span className="font-mono text-sm text-subtle">—</span>
                              )
                            ) : (
                              <span className="font-mono text-[13px] text-foreground">{value}</span>
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border px-5 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-3xl">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
              Questions, answered
            </h2>
            <div className="mt-8 divide-y divide-border">
              {FAQS.map((faq, index) => {
                const isOpen = open === index;
                return (
                  <div key={faq.q}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left"
                    >
                      <span className="text-sm font-medium text-foreground">{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-subtle transition-transform duration-300",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
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
                Your first 5,000 requests are on us
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Create an account, generate an API key in the dashboard, and call the indicator
                engine from anywhere.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Get your API key
                </Link>
                <Link
                  to="/indicators"
                  className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  Browse the catalog
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
