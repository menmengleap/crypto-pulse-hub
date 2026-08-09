import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, Mail, Newspaper, type LucideIcon } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Cryptolytic" },
      { name: "description", content: "Contact the Cryptolytic team and browse common questions." },
      { property: "og:title", content: "Support — Cryptolytic" },
    ],
  }),
  component: SupportPage,
});

function ContactCard({
  icon,
  title,
  value,
  hint,
  href,
  to,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  hint: string;
  href?: string;
  to?: string;
}) {
  const Icon = icon;
  const cls =
    "panel block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40";
  const inner = (
    <>
      <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {inner}
    </a>
  );
}

const faqs = [
  {
    q: "Is the terminal really read-only?",
    a: "Yes. Cryptolytic never executes trades, never connects to your exchange keys and never holds funds. It is an analytics-only platform by design — the same terminal the team uses itself.",
  },
  {
    q: "Where does the market data come from?",
    a: "Crypto prices stream live from Binance's public market-data feed, with market caps and snapshots from CoinGecko. Stocks and forex currently run on a simulated realtime feed while a bundled live source is offline — real feeds are on the roadmap.",
  },
  {
    q: "Can I cancel or switch plans anytime?",
    a: "Yes. Billing is month-to-month (or yearly at 20% off) with no lock-in. Upgrade, downgrade or cancel from your workspace settings at any time.",
  },
  {
    q: "How accurate is the AI analysis?",
    a: "The AI analyst reads the same chart state you see — trend, RSI, momentum and structure — and writes a dated note. Treat it as a second opinion, not financial advice; every note links back to the live chart it was generated from.",
  },
  {
    q: "Which devices and browsers are supported?",
    a: "The terminal runs in any modern browser (Chrome, Firefox, Edge, Safari) on desktop and mobile. Live WebSocket data works best on desktop.",
  },
];

function SupportPage() {
  return (
    <MarketingLayout className="max-w-4xl space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <LifeBuoy className="size-3.5 text-primary" />
          Support
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">How can we help?</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We answer fast — usually within a few hours.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ContactCard
          icon={Mail}
          title="Email"
          value="support@cryptolytic.io"
          hint="Best for account & billing"
          href="mailto:support@cryptolytic.io"
        />
        <ContactCard
          icon={BookOpen}
          title="Docs"
          value="Guides & FAQ"
          hint="Read the manual"
          href="#faq"
        />
        <ContactCard
          icon={Newspaper}
          title="Updates"
          value="Blog & changelog"
          hint="System status and releases"
          to="/blog"
        />
      </div>

      <div id="faq" className="panel p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <LifeBuoy className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Frequently asked questions</h2>
            <p className="text-xs text-muted-foreground">
              Quick answers to the things people ask most
            </p>
          </div>
        </div>
        <Accordion type="single" collapsible className="mt-5">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <p className="text-xs text-muted-foreground">
        Still stuck? Write to{" "}
        <Link to="/new" search={{ tab: "pricing" }} className="text-primary hover:underline">
          pricing
        </Link>{" "}
        or check the{" "}
        <Link to="/blog" className="text-primary hover:underline">
          blog
        </Link>{" "}
        for the latest system status.
      </p>
    </MarketingLayout>
  );
}
