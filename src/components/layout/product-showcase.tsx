import type { ReactNode } from "react";
import { Gauge, Monitor, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import consolImg from "@/Img/consol.png";

function FloatChip({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "showcase-float absolute z-10 hidden items-center gap-2 rounded-lg border border-border/80 bg-background/85 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-[0_14px_34px_-14px_rgba(0,0,0,0.7)] backdrop-blur-md sm:flex",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProductShowcase({ id }: { id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Monitor className="size-3.5 text-primary" />
            Product showcase
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            The terminal, in action.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Market structure, sentiment and flows in one dense workspace — updating to the second,
            read-only by design. No orders, no wallets, no noise.
          </p>
        </div>
      </Reveal>

      <Reveal delay={120} className="mt-12">
        <div className="group relative">
          {/* Ambient glow behind the screen */}
          <div
            aria-hidden
            className="showcase-glow absolute -inset-10 rounded-[3rem] bg-primary/15 blur-3xl"
          />

          {/* Floating stat chips */}
          <FloatChip className="-left-2 top-8 lg:-left-6" delay={0}>
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-up" />
            </span>
            Live · Binance WS & CoinGecko
          </FloatChip>
          <FloatChip className="-right-2 top-24 lg:-right-6" delay={700}>
            <TrendingUp className="size-3.5 text-up" />
            RSI 64 · Strong Bullish
          </FloatChip>
          <FloatChip className="-left-2 bottom-14 lg:-left-6" delay={1400}>
            <Gauge className="size-3.5 text-down" />
            Fear & Greed 31 · Fear
          </FloatChip>

          {/* The screen — outer wrapper floats, inner frame scales on hover */}
          <div className="showcase-float">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface-2/70 p-2 shadow-[0_50px_100px_-45px_rgba(0,0,0,0.9)] transition-all duration-500 group-hover:scale-[1.01] group-hover:border-primary/35">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="mx-auto hidden items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-1 text-[10px] text-muted-foreground sm:flex">
                  <Monitor className="size-3" />
                  cryptolytic.app/terminal
                </span>
              </div>
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={consolImg}
                  alt="Cryptolytic terminal — Market Overview dashboard"
                  loading="lazy"
                  className="h-auto w-full"
                />
                {/* Light sweep across the screen */}
                <div aria-hidden className="showcase-shine pointer-events-none absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
