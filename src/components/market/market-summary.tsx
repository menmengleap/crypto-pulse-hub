import { useId, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/market-data";
import { marketSummaryData, type MarketInstrument, type SeriesPoint } from "@/lib/market-summary";
import { TerminalLink } from "@/components/layout/terminal-link";

/* ------------------------------------------------------------------------- */
/* Theme tokens                                                              */
/* ------------------------------------------------------------------------- */

const RED = "var(--down)"; // negative / bearish
const GREEN = "var(--up)"; // positive / bullish
const BLUE = "#4C8DF6"; // informational
const TEAL = "#14B8A6"; // teal positive line (10Y yield)

/* ------------------------------------------------------------------------- */
/* Formatters                                                                */
/* ------------------------------------------------------------------------- */

function fmtNum(v: number, digits = 2): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtUsd(v: number): string {
  if (v >= 1000) return `$${fmtNum(v, 0)}`;
  if (v >= 1) return `$${fmtNum(v, 2)}`;
  return `$${fmtNum(v, 3)}`;
}

/* ------------------------------------------------------------------------- */
/* Shared primitives                                                         */
/* ------------------------------------------------------------------------- */

export function MarketCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-[#1C2230] bg-[#0A0D13] transition-colors duration-200 hover:border-[#2B3242]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-[#171C26] px-3 py-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function CircleBadge({
  color,
  label,
  size = "size-6",
}: {
  color: string;
  label: string;
  size?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 select-none place-items-center rounded-full text-[9px] font-bold leading-none",
        size,
      )}
      style={{ background: `${color}1F`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

export function Pct({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("num", value >= 0 ? "text-up" : "text-down", className)}>
      {fmtPct(value)}
    </span>
  );
}

export function ChartHeader({
  icon,
  name,
  ticker,
  value,
  changePercent,
  formatValue,
}: {
  icon?: ReactNode;
  name: string;
  ticker?: string;
  value: number;
  changePercent: number;
  formatValue: (v: number) => string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold leading-tight">{name}</p>
          {ticker && <p className="truncate text-[9px] text-muted-foreground">{ticker}</p>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="num text-sm font-semibold leading-tight tracking-tight">
          {formatValue(value)}
        </p>
        <Pct value={changePercent} className="text-[11px]" />
      </div>
    </div>
  );
}

export function MarketRow({
  icon,
  name,
  ticker,
  value,
  changePercent,
  formatValue,
}: {
  icon?: ReactNode;
  name: string;
  ticker?: string;
  value: number;
  changePercent: number;
  formatValue: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[#171C26] py-1.5 transition-colors last:border-0 hover:bg-white/[0.03]">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium leading-tight">{name}</p>
        {ticker && <p className="truncate text-[9px] text-muted-foreground">{ticker}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="num text-[11px] leading-tight">{formatValue(value)}</p>
        <Pct value={changePercent} className="text-[10px]" />
      </div>
    </div>
  );
}

function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <TerminalLink
      to={to}
      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#4C8DF6] transition-colors hover:text-[#6EA8FF]"
    >
      {children}
      <ChevronRight className="size-3" />
    </TerminalLink>
  );
}

/* ------------------------------------------------------------------------- */
/* Charts (SSR-safe custom SVG — thin strokes, subtle fills)                 */
/* ------------------------------------------------------------------------- */

export function MarketAreaChart({
  data,
  color,
  height = 120,
  showLabels = false,
  formatValue,
}: {
  data: SeriesPoint[];
  color: string;
  height?: number;
  showLabels?: boolean;
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradId = useId().replace(/:/g, "");

  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 100;
  const H = 40;
  const pad = 2;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - pad - ((d.value - min) / span) * (H - pad * 2);
    return { x, y, ...d };
  });

  const line = `M ${pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ")}`;
  const area = `${line} L ${W},${H} L 0,${H} Z`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const hovered = hover !== null ? pts[hover] : null;
  const hoverX = hovered ? (hovered.x / W) * 100 : 0;
  const hoverY = hovered ? (1 - hovered.y / H) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`ms-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#ms-${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="chart-draw"
        />
      </svg>

      {hovered && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-foreground/20"
            style={{ left: `${hoverX}%` }}
          />
          <div
            className="pointer-events-none absolute z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${hoverX}%`,
              top: `${hoverY}%`,
              background: color,
              boxShadow: `0 0 0 3px ${color}55`,
            }}
          />
          <div
            className="pointer-events-none absolute -top-1 z-20 -translate-x-1/2 whitespace-nowrap rounded border border-[#2B3242] bg-[#0A0D13] px-2 py-1 text-[10px] shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, hoverX))}%` }}
          >
            <p className="text-muted-foreground">{hovered.label}</p>
            <p className="num font-semibold" style={{ color }}>
              {formatValue(hovered.value)}
            </p>
          </div>
        </>
      )}

      {showLabels && (
        <div className="absolute inset-x-0 -bottom-4 flex justify-between text-[9px] text-muted-foreground/70">
          <span>{pts[0]?.label ?? ""}</span>
          <span>{pts[Math.floor((pts.length - 1) / 2)]?.label ?? ""}</span>
          <span>{pts[pts.length - 1]?.label ?? ""}</span>
        </div>
      )}
    </div>
  );
}

export function BarChartMini({
  data,
  height = 64,
  formatValue,
}: {
  data: SeriesPoint[];
  height?: number;
  formatValue: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (data.length < 1) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values) * 1.15 || 1;
  const W = 100;
  const H = 30;
  const slot = W / data.length;
  const bw = slot * 0.55;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.min(data.length - 1, Math.floor(ratio * data.length)));
  };

  const hovered = hover !== null ? data[hover] : null;
  const hoverX = hover !== null ? ((hover + 0.5) / data.length) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
        {data.map((d, i) => {
          const x = i * slot + (slot - bw) / 2;
          const h = (d.value / max) * H;
          const y = H - h;
          return (
            <rect
              key={d.label}
              x={x}
              y={y}
              width={bw}
              height={h}
              rx={0.4}
              fill={hover === i ? "#6EA8FF" : BLUE}
              opacity={hover === i ? 1 : 0.85}
            />
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -top-1 z-20 -translate-x-1/2 whitespace-nowrap rounded border border-[#2B3242] bg-[#0A0D13] px-2 py-1 text-[10px] shadow-lg"
          style={{ left: `${Math.min(88, Math.max(12, hoverX))}%` }}
        >
          <p className="text-muted-foreground">{hovered.label}</p>
          <p className="num font-semibold" style={{ color: BLUE }}>
            {formatValue(hovered.value)}
          </p>
        </div>
      )}

      <div className="absolute inset-x-0 -bottom-4 flex justify-between text-[9px] text-muted-foreground/70">
        <span>{data[0]?.label ?? ""}</span>
        <span>{data[data.length - 1]?.label ?? ""}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Panels                                                                    */
/* ------------------------------------------------------------------------- */

export function MarketChart({ data }: { data: typeof marketSummaryData.sp500 }) {
  return (
    <MarketCard
      title="Market overview"
      action={
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Intraday</span>
      }
      bodyClassName="pt-3"
    >
      <ChartHeader
        icon={<CircleBadge color="#F97316" label="SP" />}
        name={data.name}
        ticker={data.ticker}
        value={data.value}
        changePercent={data.changePercent}
        formatValue={(v) => `$${fmtNum(v, 2)}`}
      />
      <div className="mt-6">
        <MarketAreaChart
          data={data.series}
          color={RED}
          height={170}
          showLabels
          formatValue={(v) => `$${fmtNum(v, 2)}`}
        />
      </div>
    </MarketCard>
  );
}

export function MajorIndices({ items }: { items: MarketInstrument[] }) {
  return (
    <MarketCard title="Major indices" bodyClassName="p-0">
      <div className="px-3 py-1">
        {items.map((it) => (
          <MarketRow
            key={it.symbol}
            icon={<CircleBadge color={it.color} label={it.badge} />}
            name={it.name}
            ticker={it.ticker}
            value={it.price}
            changePercent={it.changePercent}
            formatValue={(v) => fmtNum(v, 2)}
          />
        ))}
      </div>
    </MarketCard>
  );
}

export function CryptoAssets({ items }: { items: MarketInstrument[] }) {
  return (
    <div className="border-t border-[#171C26] pt-1">
      {items.map((a) => (
        <MarketRow
          key={a.symbol}
          icon={<CircleBadge color={a.color} label={a.badge} />}
          name={a.name}
          ticker={a.ticker}
          value={a.price}
          changePercent={a.changePercent}
          formatValue={fmtUsd}
        />
      ))}
    </div>
  );
}

export function CryptoMarketCap({
  cap,
  assets,
}: {
  cap: typeof marketSummaryData.cryptoMarketCap;
  assets: MarketInstrument[];
}) {
  const { btc, eth, others } = cap.dominance;
  return (
    <MarketCard
      title="Crypto market cap"
      action={<Pct value={cap.changePercent} className="text-[11px]" />}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="num text-lg font-semibold tracking-tight">
          ${(cap.value / 1e12).toFixed(2)}T
        </p>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
          24h · {fmtUsd(cap.change)}
        </span>
      </div>

      <div className="mt-3">
        <MarketAreaChart
          data={cap.series}
          color={RED}
          height={90}
          formatValue={(v) => `$${(v / 1e12).toFixed(2)}T`}
        />
      </div>

      <div className="mt-4">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          Bitcoin dominance
        </p>
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full">
          <div style={{ width: `${btc}%`, background: "#F7931A" }} />
          <div style={{ width: `${eth}%`, background: "#7B8CF7" }} />
          <div style={{ width: `${others}%`, background: "#3A4152" }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground">
          <span>BTC {btc}%</span>
          <span>ETH {eth}%</span>
          <span>Others {others}%</span>
        </div>
      </div>

      <CryptoAssets items={assets} />

      <div className="mt-2">
        <CardLink to="/assets">See all crypto assets</CardLink>
      </div>
    </MarketCard>
  );
}

export function FuturesList({ items }: { items: MarketInstrument[] }) {
  return (
    <div>
      <p className="px-0.5 pb-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        Commodities & futures
      </p>
      {items.map((f) => (
        <MarketRow
          key={f.symbol}
          icon={<CircleBadge color={f.color} label={f.badge} />}
          name={f.name}
          ticker={f.ticker}
          value={f.price}
          changePercent={f.changePercent}
          formatValue={fmtUsd}
        />
      ))}
    </div>
  );
}

export function DollarIndex({
  dxy,
  futures,
}: {
  dxy: typeof marketSummaryData.dollarIndex;
  futures: MarketInstrument[];
}) {
  return (
    <MarketCard
      title="US Dollar Index"
      bodyClassName="p-0"
      action={<Pct value={dxy.changePercent} className="pr-3 text-[11px]" />}
    >
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-[#171C26] p-3 lg:border-b-0 lg:border-r">
          <div className="flex items-baseline gap-2">
            <p className="num text-lg font-semibold tracking-tight">{fmtNum(dxy.value, 2)}</p>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">DXY</span>
          </div>
          <div className="mt-4">
            <MarketAreaChart
              data={dxy.series}
              color={RED}
              height={96}
              formatValue={(v) => fmtNum(v, 2)}
            />
          </div>
        </div>
        <div className="p-3">
          <FuturesList items={futures} />
          <div className="mt-2">
            <CardLink to="/derivatives">See all futures</CardLink>
          </div>
        </div>
      </div>
    </MarketCard>
  );
}

export function EconomicIndicators({ data }: { data: typeof marketSummaryData.inflation }) {
  return (
    <div className="mt-4 border-t border-[#171C26] pt-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        US annual inflation rate
      </p>
      <div className="mt-4">
        <BarChartMini data={data.series} height={64} formatValue={(v) => `${v.toFixed(1)}%`} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { label: "Avg", value: data.avg },
          { label: "Forecast", value: data.forecast },
          { label: "Next release", value: data.nextRelease },
        ].map((cell) => (
          <div
            key={cell.label}
            className="rounded border border-[#1C2230] bg-[#0A0D13] px-1 py-1.5 text-center"
          >
            <p className="truncate text-[8px] uppercase tracking-wider text-muted-foreground">
              {cell.label}
            </p>
            <p className="num mt-0.5 truncate text-[10px] font-semibold">{cell.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <CardLink to="/fear-greed">See all economic indicators</CardLink>
      </div>
    </div>
  );
}

export function TreasuryYield({
  t,
  inflation,
}: {
  t: typeof marketSummaryData.treasury10y;
  inflation: typeof marketSummaryData.inflation;
}) {
  return (
    <MarketCard title="US 10Y yield">
      <ChartHeader
        icon={<CircleBadge color={TEAL} label="10Y" />}
        name={t.name}
        ticker={t.ticker}
        value={t.value}
        changePercent={t.changePercent}
        formatValue={(v) => `${fmtNum(v, 2)}%`}
      />
      <div className="mt-4">
        <MarketAreaChart
          data={t.series}
          color={TEAL}
          height={84}
          formatValue={(v) => `${v.toFixed(2)}%`}
        />
      </div>
      <EconomicIndicators data={inflation} />
    </MarketCard>
  );
}

/* ------------------------------------------------------------------------- */
/* Page                                                                      */
/* ------------------------------------------------------------------------- */

export function MarketSummary({ className }: { className?: string }) {
  const d = marketSummaryData;
  return (
    <section
      className={cn("rounded-lg border border-[#1C2230] bg-[#07090D] p-2.5 sm:p-3", className)}
    >
      <header className="flex items-center gap-1 px-1 pb-2.5 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
          Market summary
        </h2>
        <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
      </header>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MarketChart data={d.sp500} />
        </div>
        <MajorIndices items={d.indices} />

        <div className="lg:col-span-2">
          <CryptoMarketCap cap={d.cryptoMarketCap} assets={d.cryptoAssets} />
        </div>
        <TreasuryYield t={d.treasury10y} inflation={d.inflation} />

        <div className="lg:col-span-3">
          <DollarIndex dxy={d.dollarIndex} futures={d.futures} />
        </div>
      </div>
    </section>
  );
}

export default MarketSummary;
