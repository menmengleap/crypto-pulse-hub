import { cn } from "@/lib/utils";

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-up/25 bg-up/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-up",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-up" />
      </span>
      Live
    </span>
  );
}
