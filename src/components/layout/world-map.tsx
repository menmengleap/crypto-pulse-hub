import { useMemo, useState, type ReactNode } from "react";
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { cn } from "@/lib/utils";

const WIDTH = 960;
const HEIGHT = 500;

export const MAP_BASE_FILL = "rgba(255,255,255,0.045)";
export const MAP_HOVER_FILL = "rgba(46,211,160,0.95)";
export const MAP_SELECT_FILL = "rgba(46,211,160,0.7)";

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

/** A per-country value shown on the heatmap. */
export type HeatmapStat = {
  id: string;
  name: string;
  flag?: string;
  /** Value used for ranking (descending). */
  rankValue: number;
};

/**
 * Interactive world choropleth. Handles hover / click-select / keyboard focus
 * and renders a floating tooltip; the caller supplies the fill color logic
 * and the tooltip content via `renderTooltip`.
 */
export function WorldHeatmap({
  data,
  fillFor,
  ariaLabel,
  renderTooltip,
}: {
  data: ReadonlyMap<string, HeatmapStat>;
  /** (stat, isHovered, isSelected) → fill color. */
  fillFor: (stat: HeatmapStat | undefined, hovered: boolean, selected: boolean) => string;
  ariaLabel: string;
  renderTooltip: (stat: HeatmapStat, rank: number) => ReactNode;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tip, setTip] = useState<{ stat: HeatmapStat; rank: number; x: number; y: number } | null>(
    null,
  );

  const rankOf = useMemo(() => {
    const m = new Map<string, number>();
    Array.from(data.values())
      .sort((a, b) => b.rankValue - a.rankValue)
      .forEach((s, i) => m.set(s.id, i + 1));
    return m;
  }, [data]);

  return (
    <div
      className="relative"
      onMouseMove={(e) => {
        const id = (e.target as Element).closest?.("path")?.getAttribute("data-id") ?? null;
        setHoverId(id);
        const s = id ? data.get(id) : undefined;
        setTip(s ? { stat: s, rank: rankOf.get(s.id) ?? 0, x: e.clientX, y: e.clientY } : null);
      }}
      onMouseLeave={() => {
        setHoverId(null);
        setTip(null);
      }}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={ariaLabel}>
        {countries.map((c) => {
          const stat = data.get(c.id);
          const active = !!stat;
          const hovered = hoverId === c.id;
          const selected = selectedId === c.id;
          const dim =
            (hoverId !== null && hoverId !== c.id) || (selectedId !== null && selectedId !== c.id);
          return (
            <path
              key={c.id}
              data-id={c.id}
              d={c.d ?? undefined}
              fill={fillFor(stat, hovered, selected)}
              className={cn(
                "transition-[fill,opacity] duration-200",
                active && "hover:cursor-pointer hover:brightness-125",
              )}
              style={{ opacity: dim ? 0.45 : 1 }}
              aria-label={stat ? c.name : undefined}
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

      {tip && (
        <div
          className="pointer-events-none fixed z-50 w-56 rounded-xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-md"
          style={{
            left: Math.min(tip.x + 14, window.innerWidth - 240),
            top: Math.min(tip.y + 14, window.innerHeight - 150),
          }}
        >
          {renderTooltip(tip.stat, tip.rank)}
        </div>
      )}
    </div>
  );
}
