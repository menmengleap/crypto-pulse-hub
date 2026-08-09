import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { Globe2 } from "lucide-react";
import { LiveBadge } from "@/components/market/live-badge";
import { cn } from "@/lib/utils";
import {
  countryFill,
  fmtNum,
  MAP_BASE_FILL,
  type VisitorCountry,
  useVisitorStats,
} from "@/lib/visitors";

const WIDTH = 960;
const HEIGHT = 500;

type MapCountry = { id: string; name: string; d: string | null };

type WorldFeatureCollection = {
  features: Array<{
    id?: string | number;
    properties?: { name?: string };
    geometry: unknown;
  }>;
};

function buildCountries(): MapCountry[] {
  const topology = world as unknown as Topology;
  const fc = feature(topology, topology.objects["countries"]!) as unknown as WorldFeatureCollection;
  const projection = geoNaturalEarth1().fitSize(
    [WIDTH, HEIGHT],
    fc as unknown as GeoPermissibleObjects,
  );
  const path = geoPath(projection);
  return fc.features.map((f) => ({
    id: String(f.id ?? ""),
    name: f.properties?.name ?? "",
    d: f.geometry ? (path(f.geometry as GeoPermissibleObjects) ?? null) : null,
  }));
}

const countries = buildCountries();

export function AudienceSection() {
  const { countries: stats, byId, countryCount } = useVisitorStats();
  const maxShare = stats[0]?.share ?? 1;
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tip, setTip] = useState<{ stat: VisitorCountry; x: number; y: number } | null>(null);

  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    stats.forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [stats]);

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <Globe2 className="size-3.5 text-primary" />
              Audience
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Used across the globe.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Visitors from {countryCount} countries open the terminal every day — the darker the
              country, the more sessions it sends. Hover to explore.
            </p>
          </div>
          <LiveBadge />
        </div>

        <div
          className="relative mt-10"
          onMouseMove={(e) => {
            const id = (e.target as Element).closest?.("path")?.getAttribute("data-id") ?? null;
            setHoverId(id);
            const s = id ? byId.get(id) : undefined;
            setTip(s ? { stat: s, x: e.clientX, y: e.clientY } : null);
          }}
          onMouseLeave={() => {
            setHoverId(null);
            setTip(null);
          }}
        >
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label="World map heatmap showing visitor sessions by country"
          >
            {countries.map((c) => {
              const stat = byId.get(c.id);
              const active = !!stat;
              const dim =
                (hoverId !== null && hoverId !== c.id) ||
                (selectedId !== null && selectedId !== c.id);
              return (
                <path
                  key={c.id}
                  data-id={c.id}
                  d={c.d ?? undefined}
                  fill={
                    hoverId === c.id
                      ? "rgba(46,211,160,0.95)"
                      : selectedId === c.id
                        ? "rgba(46,211,160,0.7)"
                        : stat
                          ? countryFill(stat.share, maxShare)
                          : MAP_BASE_FILL
                  }
                  className={cn(
                    "transition-[fill,opacity] duration-200",
                    active && "hover:cursor-pointer hover:brightness-125",
                  )}
                  style={{ opacity: dim ? 0.45 : 1 }}
                  aria-label={stat ? `${c.name}, ${fmtNum(stat.sessions)} sessions` : c.name}
                  tabIndex={active ? 0 : undefined}
                  onFocus={() => {
                    if (active) setHoverId(c.id);
                  }}
                  onBlur={() => setHoverId((h) => (h === c.id ? null : h))}
                  onClick={() => {
                    if (!active) return;
                    setSelectedId((s) => (s === c.id ? null : c.id));
                  }}
                  onKeyDown={(e) => {
                    if (!active) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId((s) => (s === c.id ? null : c.id));
                    }
                  }}
                />
              );
            })}
          </svg>

          {/* Tooltip */}
          {tip && (
            <div
              className="pointer-events-none fixed z-50 w-56 rounded-xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-md"
              style={{
                left: Math.min(tip.x + 14, window.innerWidth - 240),
                top: Math.min(tip.y + 14, window.innerHeight - 150),
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{tip.stat.flag}</span>
                <p className="truncate text-sm font-semibold">{tip.stat.name}</p>
              </div>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <dt className="text-muted-foreground">Sessions</dt>
                  <dd className="num mt-0.5 font-semibold">{fmtNum(tip.stat.sessions)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Share</dt>
                  <dd className="num mt-0.5 font-semibold">{tip.stat.share.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Rank</dt>
                  <dd className="num mt-0.5 font-semibold">#{rankOf.get(tip.stat.id) ?? "—"}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
