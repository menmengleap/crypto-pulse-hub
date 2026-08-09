import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import ceoImg from "@/Img/ceo.jpg";
import frontendImg from "@/Img/frontend.jpg";
import marketingImg from "@/Img/marketing.jpg";

type Member = {
  name: string;
  role: string;
  tagline: string;
  image: string;
  bio: string;
  focus: string[];
  stats: { label: string; value: string }[];
};

const members: Member[] = [
  {
    name: "Men Mengleap",
    role: "CEO / Full Stack Developer",
    tagline: "Vision, architecture & the code that holds it together.",
    image: ceoImg,
    bio: "Men Mengleap is the founder and CEO of Cryptolytic. As a full stack developer he designed the entire platform — from the Go analytics API and realtime market data pipeline to the terminal interface you're reading this on. He built Cryptolytic on a simple conviction: analysts need quiet, dense tools, not trading floors.",
    focus: ["Product vision", "Backend architecture", "Realtime data", "Team leadership"],
    stats: [
      { label: "Founded", value: "Cryptolytic" },
      { label: "Stack", value: "Go · React" },
    ],
  },
  {
    name: "Chheng Mengsithy",
    role: "Trader / Frontend Developer",
    tagline: "Reads the chart, then builds the screen.",
    image: frontendImg,
    bio: "Chheng Mengsithy bridges both sides of the market. As a trader he studies price structure, momentum and liquidity; as a frontend developer he turns those insights into the interface itself. He owns the look and feel of Cryptolytic — the charts, the layouts, and the small details that make dense data readable.",
    focus: ["Technical analysis", "UI / UX", "Charting", "Component design"],
    stats: [
      { label: "Focus", value: "Frontend" },
      { label: "Style", value: "Trading + design" },
    ],
  },
  {
    name: "Heng Ratnakvisal",
    role: "Trader / Marketing",
    tagline: "Tells the story behind the market.",
    image: marketingImg,
    bio: "Heng Ratnakvisal combines trading experience with marketing instinct. He tracks market sentiment and news flow, then translates Cryptolytic's analytics into clear language for the community. He makes sure the signal we ship reaches the people who can actually use it.",
    focus: ["Market sentiment", "Content strategy", "Community", "News & analysis"],
    stats: [
      { label: "Focus", value: "Growth" },
      { label: "Style", value: "Trader + storyteller" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Infinite marquee — duplicates the list and scrolls it seamlessly forever.
// Touching (hovering / focusing / tapping) a face pauses the scroll and opens
// a spotlight panel with that person's details. The panel stays open while the
// cursor is over the images or the panel, and closes when you move away.
// ---------------------------------------------------------------------------

function SpotlightPanel({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <div
      key={member.name}
      className="panel animate-in fade-in-0 slide-in-from-bottom-3 grid overflow-hidden duration-300 md:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden md:aspect-auto">
        <img
          src={member.image}
          alt={`${member.name} — ${member.role}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:bg-none" />
      </div>
      <div className="relative flex flex-col gap-4 p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="pr-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            {member.role}
          </p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{member.name}</h3>
          <p className="mt-1.5 text-sm italic text-muted-foreground">{member.tagline}</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
        <div className="flex flex-wrap gap-1.5">
          {member.focus.map((f) => (
            <span
              key={f}
              className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>
        <dl className="mt-auto grid max-w-sm grid-cols-2 gap-3 border-t border-border pt-4">
          {member.stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {s.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function SpotlightPlaceholder() {
  return (
    <div className="panel flex min-h-[280px] items-center justify-center gap-2.5 px-6 py-10 text-sm text-muted-foreground">
      <Users className="size-4 text-primary" />
      Hover or tap a face above to meet the team.
    </div>
  );
}

function TeamShowcase() {
  const [active, setActive] = useState<Member | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const track = [...members, ...members];

  // Touch pointers have no hover state — tapping anywhere outside the showcase
  // closes the panel, matching the desktop hover-out behaviour.
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [active]);

  return (
    <div
      ref={wrapperRef}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") setActive(null);
      }}
    >
      {/* Infinite scroll strip — pauses while a face is touched */}
      <div className="group relative overflow-hidden" aria-label="Team members, scrolling">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        {/* mr-5 per card (not flex gap) keeps the -50% loop pixel-perfect */}
        <div className="marquee-track flex w-max py-2 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] has-[:active]:[animation-play-state:paused]">
          {track.map((m, i) => (
            <button
              key={`${m.name}-${i}`}
              type="button"
              onClick={() => setActive(m)}
              onPointerEnter={() => setActive(m)}
              onFocus={() => setActive(m)}
              aria-pressed={active?.name === m.name}
              // The second half of the track is a visual duplicate for the
              // seamless loop — keep it out of the tab order and screen readers.
              tabIndex={i >= members.length ? -1 : 0}
              aria-hidden={i >= members.length}
              className={cn(
                "panel group/card mr-5 w-72 shrink-0 cursor-pointer overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-28px_var(--primary)]",
                active?.name === m.name && "border-primary/50 ring-2 ring-primary/40",
              )}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={m.image}
                  alt={`${m.name} — ${m.role}`}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale transition-all duration-500 group-hover/card:scale-105 group-hover/card:grayscale-0"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-16">
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <p className="text-[11px] font-medium text-primary">{m.role}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Spotlight — who is that person? */}
      <div className="mt-6" aria-live="polite">
        {active ? (
          <SpotlightPanel member={active} onClose={() => setActive(null)} />
        ) : (
          <SpotlightPlaceholder />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section (embedded in the Home page)
// ---------------------------------------------------------------------------

export function TeamSection({ id }: { id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal>
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Users className="size-3.5 text-primary" />
            Three people. One terminal.
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Built by analysts, for analysts.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Cryptolytic is a small team with a clear idea: market intelligence should be precise,
            fast and honest — and never try to sell you anything. Meet the people who build it.
          </p>
        </div>
      </Reveal>

      {/* Infinite scroll strip + spotlight panel */}
      <Reveal delay={100} className="mt-8">
        <TeamShowcase />
      </Reveal>

      {/* Sentiment-style accent strip */}
      <Reveal delay={200} className="mt-8">
        <div className="panel grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-up/10 text-up">
              <ArrowUpRight className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Analysis only</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No orders, no wallets, no exit liquidity. The terminal is read-only by design.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-down/10 text-down">
              <ArrowDownRight className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Built in public</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Every chart, indicator and insight ships through the same terminal we use ourselves.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
