import { MessageSquareQuote, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  stars: number;
};

export const testimonials: Testimonial[] = [
  {
    quote:
      "I've tried every crypto dashboard out there. Cryptolytic is the first one that treats reading the market like a craft — dense, quiet and honest. No order tickets pretending to be insight.",
    name: "Daniel Osei",
    role: "Prop desk analyst",
    initials: "DO",
    color: "#F7931A",
    stars: 5,
  },
  {
    quote:
      "The AI analysis notes read like a senior desk write-up. Multi-timeframe structure, momentum and key levels in one pass — I copy them straight into my research logs.",
    name: "Mira Chen",
    role: "Fund researcher",
    initials: "MC",
    color: "#7B8CF7",
    stars: 5,
  },
  {
    quote:
      "Fear & Greed, funding and dominance on one screen. It's the only tool I open before I decide anything.",
    name: "Tomás Rivera",
    role: "Independent trader",
    initials: "TR",
    color: "#14F195",
    stars: 5,
  },
  {
    quote:
      "The screener's RSI and breakout filters cut my watchlist from 400 pairs to a handful that actually matter. I get my mornings back.",
    name: "Aisha Bello",
    role: "Portfolio manager",
    initials: "AB",
    color: "#E84142",
    stars: 5,
  },
  {
    quote:
      "Finally, an analytics platform that doesn't try to sell me anything. Read-only, fast, and the news sentiment tagging is genuinely useful.",
    name: "Jonas Weber",
    role: "Quant analyst",
    initials: "JW",
    color: "#5BC236",
    stars: 5,
  },
  {
    quote:
      "The heatmap and dominance views give me the macro picture in seconds. My newsletter quotes Cryptolytic every week.",
    name: "Sofia Marino",
    role: "Market newsletter author",
    initials: "SM",
    color: "#FF7BC4",
    stars: 5,
  },
];

export function InitialsAvatar({
  initials,
  color,
  className,
}: {
  initials: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full text-[11px] font-bold",
        className,
      )}
      style={{ background: `${color}22`, color }}
    >
      {initials}
    </span>
  );
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${count} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("size-3.5", i < count ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  return (
    <Reveal delay={index * 100}>
      <article className="panel flex h-full flex-col gap-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-28px_var(--primary)]">
        <div className="flex items-center justify-between">
          <MessageSquareQuote className="size-5 text-primary" />
          <Stars count={t.stars} />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">“{t.quote}”</p>
        <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
          <InitialsAvatar initials={t.initials} color={t.color} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t.role}</p>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export function TestimonialSection({ id }: { id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <MessageSquareQuote className="size-3.5 text-primary" />
            Testimonials
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Trusted by analysts who read charts for a living.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            From prop desks to newsletters — the same quiet, dense terminal, used by people whose
            job is knowing what the market will do next.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {testimonials.map((t, i) => (
          <TestimonialCard key={t.name} t={t} index={i} />
        ))}
      </div>
    </section>
  );
}
