import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { AssetLogo } from "./asset-logo";
import { type Asset, fmtCompact, fmtPct, fmtPrice } from "@/lib/market-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || action) && (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function ChangeBadge({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        up ? "bg-up/10 text-up" : "bg-down/10 text-down",
        className,
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {fmtPct(value)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  change,
  hint,
  icon,
  accent,
  children,
}: {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "btc" | "down" | "muted";
  children?: ReactNode;
}) {
  const ring = {
    primary: "bg-primary/12 text-primary",
    btc: "bg-btc/12 text-btc",
    down: "bg-down/12 text-down",
    muted: "bg-muted text-muted-foreground",
  }[accent ?? "muted"];

  return (
    <div className="panel p-4 transition-colors hover:border-primary/30">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="num mt-1.5 truncate text-xl font-semibold tracking-tight">{value}</p>
        </div>
        {icon && <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", ring)}>{icon}</span>}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {typeof change === "number" && <ChangeBadge value={change} />}
        {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function MarketCard({ asset }: { asset: Asset }) {
  const up = asset.change24h >= 0;
  return (
    <article className="panel group relative min-w-[230px] p-4 transition-all hover:border-primary/35 hover:shadow-[0_18px_40px_-28px_var(--primary)]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <AssetLogo asset={asset} className="size-9 rounded-xl" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{asset.symbol}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{asset.name}</span>
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More options for ${asset.symbol}`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/chart">Open chart</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/watchlist">Add to watchlist</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/ai-analysis">AI analysis</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="num mt-3 text-lg font-semibold tracking-tight">{fmtPrice(asset.price)}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <ChangeBadge value={asset.change24h} />
        <span className="truncate text-[11px] text-muted-foreground">Vol {fmtCompact(asset.volume24h)}</span>
      </div>
      <div className="mt-3">
        <Sparkline data={asset.spark} positive={up} />
      </div>
    </article>
  );
}

export function IndicatorCard({
  name,
  value,
  signal,
  tone,
  progress,
}: {
  name: string;
  value: string;
  signal: string;
  tone: "up" | "down" | "neutral";
  progress: number;
}) {
  const color = tone === "up" ? "bg-up" : tone === "down" ? "bg-down" : "bg-btc";
  const text = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-btc";
  return (
    <div className="panel p-4 transition-colors hover:border-primary/30">
      <p className="truncate text-xs text-muted-foreground">{name}</p>
      <p className="num mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
      <p className={cn("mt-0.5 truncate text-xs font-medium", text)}>{signal}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function SentimentGauge({ score, label, size = 220 }: { score: number; label: string; size?: number }) {
  const r = 80;
  const c = Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? "var(--up)" : score >= 55 ? "var(--btc)" : score >= 45 ? "var(--muted-foreground)" : "var(--down)";
  return (
    <div className="relative mx-auto" style={{ width: size }}>
      <svg viewBox="0 0 200 110" className="w-full">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="num text-4xl font-semibold tracking-tight" style={{ color }}>
          {score}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function AreaChartMini({
  data,
  height = 220,
  positive = true,
}: {
  data: number[];
  height?: number;
  positive?: boolean;
}) {
  return (
    <div style={{ height }}>
      <Sparkline data={data} positive={positive} className="h-full" strokeWidth={2} />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AssetRowCell({ asset }: { asset: Asset }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <AssetLogo asset={asset} className="size-8" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{asset.symbol}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{asset.name}</span>
      </span>
    </div>
  );
}

export function TrendBadge({ trend }: { trend: Asset["trend"] }) {
  const tone = trend.includes("Bull") ? "bg-up/10 text-up" : trend.includes("Bear") ? "bg-down/10 text-down" : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", tone)}>{trend}</span>;
}

export function MarketCapCell({ value }: { value: number }) {
  return <span className="num text-sm">{fmtCompact(value)}</span>;
}
