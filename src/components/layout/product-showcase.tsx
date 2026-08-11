import { Monitor } from "lucide-react";
import { Reveal } from "./reveal";
import consolImg from "@/Img/consol.png";

export function ProductShowcase({ id }: { id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal>
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The terminal, in action.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Market structure, sentiment, and flows in one dense workspace — updating every second,
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
