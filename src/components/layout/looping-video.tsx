import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Decorative background video that loops continuously. Autoplay is skipped
 * for users with `prefers-reduced-motion: reduce` (accessibility).
 */
export function LoopingVideo({
  src,
  className,
  overlayClassName = "bg-black/40",
  preload = "metadata",
  label,
}: {
  src: string;
  className?: string;
  overlayClassName?: string;
  preload?: "auto" | "metadata" | "none";
  label?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tryPlay = () => {
      video.muted = true;
      video.loop = true;
      void video.play().catch(() => {
        /* autoplay blocked or unsupported — leave the poster frame */
      });
    };
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay);
    }
    return () => video.removeEventListener("canplay", tryPlay);
  }, [src]);

  return (
    <>
      <video
        ref={ref}
        className={cn("h-full w-full object-cover", className)}
        src={src}
        muted
        loop
        playsInline
        preload={preload}
        aria-label={label}
      />
      <div aria-hidden className={cn("absolute inset-0", overlayClassName)} />
    </>
  );
}
