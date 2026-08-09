import { Link } from "@tanstack/react-router";
import { Rocket, type LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-20 text-center">
      <span className="relative grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Icon className="size-6" />
        <span className="absolute -right-1 -top-1 size-2.5 animate-pulse rounded-full bg-primary" />
      </span>
      <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Rocket className="size-3" />
        Coming soon
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/blog"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Follow releases on the blog
        </Link>
        <Link
          to="/market"
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          Back to the terminal
        </Link>
      </div>
    </div>
  );
}
