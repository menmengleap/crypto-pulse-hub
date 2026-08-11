import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export interface CardItem {
  id?: string;
  imgUrl?: string;
  alt?: string;
  linkUrl?: string;
  /** Custom card content (rendered instead of an image when provided). */
  content?: ReactNode;
}

interface SocialCardsProps {
  cards: CardItem[];
  /** Classes applied to each card — use this to size the cards. */
  cardClassName?: string;
  className?: string;
  /** Slide speed in px/second — larger drifts faster. */
  speed?: number;
}

/** Gentle sway (px) used when the row fits fully inside its container. */
const SWAY_PX = 36;
const SPEED_PX_PER_SEC = 110;

/**
 * A single straight row of cards that drifts left and then right on a loop.
 *
 * The track is a `w-max` flex row (never wraps — always one row) inside an
 * overflow-hidden viewport with edge fades. On mount (and resize) the row
 * measures how far it can travel, then gsap oscillates `x` between 0 and the
 * max travel: slide left to reveal the end of the row, then ease back right.
 * Hovering pauses the drift so cards can be read.
 */
export function CardFanCarousel({
  cards,
  cardClassName,
  className,
  speed = SPEED_PX_PER_SEC,
}: SocialCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);

  // Measure how far the row can slide (once + on resize).
  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      const overflow = track.scrollWidth - container.clientWidth;
      setTravel(overflow > 0 ? overflow : SWAY_PX);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cards]);

  // Left → right oscillation.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !travel) return;

    if (reduceMotion) {
      gsap.set(track, { x: 0 });
      return;
    }

    // Keep the drift at a constant visual speed regardless of row length.
    const duration = Math.max(6, travel / speed); // seconds per direction
    const tween = gsap.to(track, {
      x: -travel,
      duration,
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
    });

    // Hovering pauses the drift so the cards can be read.
    const container = containerRef.current;
    const onEnter = () => tween.pause();
    const onLeave = () => tween.play();
    container?.addEventListener("mouseenter", onEnter);
    container?.addEventListener("mouseleave", onLeave);

    return () => {
      container?.removeEventListener("mouseenter", onEnter);
      container?.removeEventListener("mouseleave", onLeave);
      tween.kill();
      gsap.set(track, { x: 0 });
    };
  }, [travel, speed, reduceMotion]);

  if (!cards.length) return null;

  const cardBase = cn(
    "shrink-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]",
    cardClassName ?? "aspect-[4/7] w-36 sm:w-44",
  );

  return (
    <section className={cn("relative z-20 w-full overflow-hidden py-4 lg:py-8", className)}>
      {/* Edge fades — cards glide in and out of view cleanly. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24" />

      <div
        ref={containerRef}
        className={cn(
          "mx-auto w-full max-w-[90rem]",
          // Reduced motion: clip nothing — let the row scroll so every card
          // stays reachable without animation.
          reduceMotion ? "overflow-x-auto" : "overflow-hidden",
        )}
      >
        <div ref={trackRef} className="flex w-max items-center gap-4 will-change-transform">
          {cards.map((card, index) => {
            if (card.content !== undefined) {
              return (
                <div key={card.id ?? index} className={cardBase}>
                  {card.content}
                </div>
              );
            }
            const image = (
              <div className="relative h-full w-full overflow-hidden">
                <img
                  src={card.imgUrl}
                  loading="lazy"
                  alt={card.alt || `Card ${index}`}
                  className="absolute inset-0 z-10 h-full w-full object-cover"
                />
              </div>
            );
            return card.linkUrl ? (
              <a
                key={card.id ?? index}
                href={card.linkUrl}
                target={card.linkUrl.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className={cn(cardBase, "cursor-pointer")}
              >
                {image}
              </a>
            ) : (
              <div key={card.id ?? index} className={cardBase}>
                {image}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CardFanCarousel;
