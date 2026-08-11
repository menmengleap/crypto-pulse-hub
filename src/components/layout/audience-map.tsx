import { useMemo, useState } from "react";
import { Globe2, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { countryFill, fmtNum, type VisitorCountry, useVisitorStats } from "@/lib/visitors";
import { inflationById, fmtPctPoint, type InflationCountry } from "@/lib/economy";
import {
  MAP_BASE_FILL,
  MAP_HOVER_FILL,
  MAP_SELECT_FILL,
  WorldHeatmap,
  type HeatmapStat,
} from "./world-map";

type View = "audience" | "economy";

function mix(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

// --- Economy ramp: low inflation = dim, high inflation = deep red ----------

const CPI_FILL_LOW = [64, 38, 30] as const; // dim brick
const CPI_FILL_HIGH = [196, 30, 24] as const; // deep red

function cpiFill(cpi: number, maxCpi: number) {
  if (cpi <= 0) return MAP_BASE_FILL;
  const t = Math.min(1, Math.pow(cpi / maxCpi, 0.55));
  return mix(CPI_FILL_LOW, CPI_FILL_HIGH, t);
}

export function AudienceSection() {
  const [view, setView] = useState<View>("audience");

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        {/* View switcher */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1">
            {(
              [
                { key: "audience", label: "Audience", icon: Globe2 },
                { key: "economy", label: "Economy", icon: LineChart },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  view === key
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === "audience" ? <AudienceView /> : <EconomyView />}
      </div>
    </section>
  );
}

function AudienceView() {
  const { countries: stats, byId, countryCount } = useVisitorStats();
  const maxShare = stats[0]?.share ?? 1;

  const data = useMemo(() => {
    const m = new Map<string, HeatmapStat>();
    stats.forEach((c) =>
      m.set(c.id, { id: c.id, name: c.name, flag: c.flag, rankValue: c.sessions }),
    );
    return m;
  }, [stats]);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Visitors from {countryCount} countries open the terminal every day.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            The darker the country, the more sessions it sends. Hover to explore.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <WorldHeatmap
          data={data}
          ariaLabel="World map heatmap showing visitor sessions by country"
          fillFor={(stat, hovered, selected) =>
            hovered
              ? MAP_HOVER_FILL
              : selected
                ? MAP_SELECT_FILL
                : stat
                  ? countryFill(byId.get(stat.id)?.share ?? 0, maxShare)
                  : MAP_BASE_FILL
          }
          renderTooltip={(stat, rank) => {
            const s: VisitorCountry | undefined = byId.get(stat.id);
            return (
              <>
                <div className="flex items-center gap-2">
                  {stat.flag && <span className="text-lg leading-none">{stat.flag}</span>}
                  <p className="truncate text-sm font-semibold">{stat.name}</p>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <dt className="text-muted-foreground">Sessions</dt>
                    <dd className="num mt-0.5 font-semibold">{fmtNum(s?.sessions ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Share</dt>
                    <dd className="num mt-0.5 font-semibold">{(s?.share ?? 0).toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rank</dt>
                    <dd className="num mt-0.5 font-semibold">#{rank}</dd>
                  </div>
                </dl>
              </>
            );
          }}
        />
      </div>
    </div>
  );
}

function EconomyView() {
  const maxCpi = useMemo(() => {
    let m = 1;
    inflationById.forEach((c) => {
      if (c.cpi > m) m = c.cpi;
    });
    return m;
  }, []);

  const data = useMemo(() => {
    const m = new Map<string, HeatmapStat>();
    inflationById.forEach((c) =>
      m.set(c.id, { id: c.id, name: c.name, flag: c.flag, rankValue: c.cpi }),
    );
    return m;
  }, []);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Annual consumer-price inflation, by country.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            The darker the red, the higher the CPI reading. Hover to explore.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <WorldHeatmap
          data={data}
          ariaLabel="World map heatmap showing annual inflation by country"
          fillFor={(stat, hovered, selected) =>
            hovered
              ? MAP_HOVER_FILL
              : selected
                ? MAP_SELECT_FILL
                : stat
                  ? cpiFill(inflationById.get(stat.id)?.cpi ?? 0, maxCpi)
                  : MAP_BASE_FILL
          }
          renderTooltip={(stat, rank) => {
            const c = inflationById.get(stat.id) as InflationCountry | undefined;
            return (
              <>
                <div className="flex items-center gap-2">
                  {stat.flag && <span className="text-lg leading-none">{stat.flag}</span>}
                  <p className="truncate text-sm font-semibold">{stat.name}</p>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <dt className="text-muted-foreground">CPI</dt>
                    <dd className="num mt-0.5 font-semibold">{c?.cpi.toFixed(1) ?? "—"}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">MoM</dt>
                    <dd
                      className={cn(
                        "num mt-0.5 font-semibold",
                        (c?.delta ?? 0) >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      {c ? fmtPctPoint(c.delta) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rank</dt>
                    <dd className="num mt-0.5 font-semibold">#{rank}</dd>
                  </div>
                </dl>
              </>
            );
          }}
        />
      </div>
    </div>
  );
}
