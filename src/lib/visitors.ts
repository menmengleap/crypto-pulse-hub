import { useEffect, useMemo, useState } from "react";

export type CountryStat = {
  id: string; // ISO 3166-1 numeric id, matches world-atlas feature ids
  name: string;
  flag: string;
  sessions: number;
};

export type VisitorCountry = CountryStat & { share: number };

// Representative audience snapshot, keyed by ISO numeric country id.
const base: CountryStat[] = [
  { id: "840", name: "United States", flag: "🇺🇸", sessions: 28420 },
  { id: "356", name: "India", flag: "🇮🇳", sessions: 19850 },
  { id: "826", name: "United Kingdom", flag: "🇬🇧", sessions: 12410 },
  { id: "276", name: "Germany", flag: "🇩🇪", sessions: 11320 },
  { id: "566", name: "Nigeria", flag: "🇳🇬", sessions: 10480 },
  { id: "360", name: "Indonesia", flag: "🇮🇩", sessions: 9180 },
  { id: "076", name: "Brazil", flag: "🇧🇷", sessions: 8620 },
  { id: "124", name: "Canada", flag: "🇨🇦", sessions: 7940 },
  { id: "704", name: "Vietnam", flag: "🇻🇳", sessions: 7410 },
  { id: "608", name: "Philippines", flag: "🇵🇭", sessions: 6980 },
  { id: "392", name: "Japan", flag: "🇯🇵", sessions: 6650 },
  { id: "410", name: "South Korea", flag: "🇰🇷", sessions: 6380 },
  { id: "250", name: "France", flag: "🇫🇷", sessions: 6120 },
  { id: "036", name: "Australia", flag: "🇦🇺", sessions: 5890 },
  { id: "528", name: "Netherlands", flag: "🇳🇱", sessions: 5410 },
  { id: "792", name: "Turkey", flag: "🇹🇷", sessions: 5120 },
  { id: "702", name: "Singapore", flag: "🇸🇬", sessions: 4880 },
  { id: "784", name: "United Arab Emirates", flag: "🇦🇪", sessions: 4630 },
  { id: "484", name: "Mexico", flag: "🇲🇽", sessions: 4410 },
  { id: "616", name: "Poland", flag: "🇵🇱", sessions: 4120 },
  { id: "724", name: "Spain", flag: "🇪🇸", sessions: 3890 },
  { id: "380", name: "Italy", flag: "🇮🇹", sessions: 3710 },
  { id: "710", name: "South Africa", flag: "🇿🇦", sessions: 3560 },
  { id: "764", name: "Thailand", flag: "🇹🇭", sessions: 3410 },
  { id: "032", name: "Argentina", flag: "🇦🇷", sessions: 3220 },
  { id: "404", name: "Kenya", flag: "🇰🇪", sessions: 2980 },
  { id: "804", name: "Ukraine", flag: "🇺🇦", sessions: 2870 },
  { id: "752", name: "Sweden", flag: "🇸🇪", sessions: 2710 },
  { id: "756", name: "Switzerland", flag: "🇨🇭", sessions: 2590 },
  { id: "643", name: "Russia", flag: "🇷🇺", sessions: 2430 },
];

export function fmtNum(v: number) {
  return v.toLocaleString("en-US");
}

/** Simulated realtime feed — nudges session counts every few seconds. */
export function useVisitorStats(enabled = true) {
  const [rows, setRows] = useState<CountryStat[]>(() => base.map((c) => ({ ...c })));

  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(() => {
      setRows((prev) =>
        prev.map((c) => ({
          ...c,
          sessions: Math.max(1, Math.round(c.sessions + (Math.random() - 0.46) * 10)),
        })),
      );
    }, 4000);
    return () => window.clearInterval(t);
  }, [enabled]);

  return useMemo(() => {
    const total = rows.reduce((sum, c) => sum + c.sessions, 0);
    const countries = rows
      .map((c) => ({ ...c, share: (c.sessions / total) * 100 }))
      .sort((a, b) => b.sessions - a.sessions);
    return {
      countries,
      byId: new Map(countries.map((c) => [c.id, c])),
      total,
      countryCount: rows.length,
    };
  }, [rows]);
}

// --- Choropleth ramp: more sessions = darker green -------------------------

const FILL_LOW = [26, 54, 48] as const; // dim green (few sessions)
const FILL_HIGH = [4, 108, 82] as const; // deep emerald (most sessions)

function mix(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export const MAP_BASE_FILL = "rgba(255,255,255,0.045)";

export function countryFill(share: number, maxShare: number) {
  if (share <= 0) return MAP_BASE_FILL;
  const t = Math.min(1, Math.pow(share / maxShare, 0.55));
  return mix(FILL_LOW, FILL_HIGH, t);
}
