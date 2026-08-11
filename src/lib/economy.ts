/**
 * Global macro snapshot — annual consumer-price inflation by country.
 *
 * Keyed by ISO 3166-1 numeric id so the map can reuse world-atlas features.
 * Mock data for now; swap for a real economic-data API later.
 */

export type InflationCountry = {
  /** ISO 3166-1 numeric id — matches world-atlas feature ids. */
  id: string;
  name: string;
  flag: string;
  /** Annual CPI change, percent. */
  cpi: number;
  /** Month-over-month change in the rate, percentage points. */
  delta: number;
};

export const inflationCountries: InflationCountry[] = [
  { id: "716", name: "Zimbabwe", flag: "🇿🇼", cpi: 57.4, delta: -1.2 },
  { id: "032", name: "Argentina", flag: "🇦🇷", cpi: 42.8, delta: -2.4 },
  { id: "792", name: "Turkey", flag: "🇹🇷", cpi: 38.1, delta: -0.9 },
  { id: "566", name: "Nigeria", flag: "🇳🇬", cpi: 26.4, delta: -0.4 },
  { id: "818", name: "Egypt", flag: "🇪🇬", cpi: 24.9, delta: -0.6 },
  { id: "104", name: "Myanmar", flag: "🇲🇲", cpi: 22.3, delta: 0.3 },
  { id: "231", name: "Ethiopia", flag: "🇪🇹", cpi: 19.6, delta: -1.1 },
  { id: "586", name: "Pakistan", flag: "🇵🇰", cpi: 16.8, delta: -0.7 },
  { id: "180", name: "DR Congo", flag: "🇨🇩", cpi: 14.2, delta: 0.2 },
  { id: "050", name: "Bangladesh", flag: "🇧🇩", cpi: 9.8, delta: -0.3 },
  { id: "894", name: "Zambia", flag: "🇿🇲", cpi: 9.4, delta: -0.5 },
  { id: "860", name: "Uzbekistan", flag: "🇺🇿", cpi: 8.9, delta: -0.2 },
  { id: "804", name: "Ukraine", flag: "🇺🇦", cpi: 8.1, delta: -0.4 },
  { id: "643", name: "Russia", flag: "🇷🇺", cpi: 7.6, delta: -0.1 },
  { id: "398", name: "Kazakhstan", flag: "🇰🇿", cpi: 7.2, delta: -0.3 },
  { id: "376", name: "Israel", flag: "🇮🇱", cpi: 6.8, delta: -0.2 },
  { id: "404", name: "Kenya", flag: "🇰🇪", cpi: 6.4, delta: -0.4 },
  { id: "524", name: "Nepal", flag: "🇳🇵", cpi: 6.1, delta: -0.1 },
  { id: "417", name: "Kyrgyzstan", flag: "🇰🇬", cpi: 5.9, delta: -0.2 },
  { id: "170", name: "Colombia", flag: "🇨🇴", cpi: 5.6, delta: -0.3 },
  { id: "144", name: "Sri Lanka", flag: "🇱🇰", cpi: 5.3, delta: -0.6 },
  { id: "688", name: "Serbia", flag: "🇷🇸", cpi: 5.1, delta: -0.2 },
  { id: "642", name: "Romania", flag: "🇷🇴", cpi: 4.9, delta: -0.1 },
  { id: "356", name: "India", flag: "🇮🇳", cpi: 4.8, delta: -0.2 },
  { id: "076", name: "Brazil", flag: "🇧🇷", cpi: 4.6, delta: -0.3 },
  { id: "710", name: "South Africa", flag: "🇿🇦", cpi: 4.5, delta: -0.1 },
  { id: "484", name: "Mexico", flag: "🇲🇽", cpi: 4.3, delta: -0.2 },
  { id: "348", name: "Hungary", flag: "🇭🇺", cpi: 4.1, delta: -0.2 },
  { id: "704", name: "Vietnam", flag: "🇻🇳", cpi: 3.8, delta: -0.1 },
  { id: "152", name: "Chile", flag: "🇨🇱", cpi: 3.7, delta: -0.2 },
  { id: "616", name: "Poland", flag: "🇵🇱", cpi: 3.6, delta: -0.1 },
  { id: "608", name: "Philippines", flag: "🇵🇭", cpi: 3.4, delta: -0.1 },
  { id: "604", name: "Peru", flag: "🇵🇪", cpi: 3.2, delta: -0.2 },
  { id: "036", name: "Australia", flag: "🇦🇺", cpi: 3.1, delta: -0.1 },
  { id: "440", name: "Lithuania", flag: "🇱🇹", cpi: 3.0, delta: -0.1 },
  { id: "360", name: "Indonesia", flag: "🇮🇩", cpi: 2.9, delta: -0.1 },
  { id: "840", name: "United States", flag: "🇺🇸", cpi: 2.9, delta: 0.0 },
  { id: "578", name: "Norway", flag: "🇳🇴", cpi: 2.8, delta: -0.1 },
  { id: "826", name: "United Kingdom", flag: "🇬🇧", cpi: 2.7, delta: -0.1 },
  { id: "040", name: "Austria", flag: "🇦🇹", cpi: 2.6, delta: 0.0 },
  { id: "724", name: "Spain", flag: "🇪🇸", cpi: 2.5, delta: -0.1 },
  { id: "124", name: "Canada", flag: "🇨🇦", cpi: 2.4, delta: -0.1 },
  { id: "276", name: "Germany", flag: "🇩🇪", cpi: 2.3, delta: -0.1 },
  { id: "156", name: "China", flag: "🇨🇳", cpi: 2.2, delta: 0.1 },
  { id: "392", name: "Japan", flag: "🇯🇵", cpi: 2.1, delta: 0.0 },
  { id: "410", name: "South Korea", flag: "🇰🇷", cpi: 2.0, delta: 0.0 },
  { id: "752", name: "Sweden", flag: "🇸🇪", cpi: 1.9, delta: -0.1 },
  { id: "250", name: "France", flag: "🇫🇷", cpi: 1.8, delta: -0.1 },
  { id: "380", name: "Italy", flag: "🇮🇹", cpi: 1.7, delta: -0.1 },
  { id: "702", name: "Singapore", flag: "🇸🇬", cpi: 1.6, delta: 0.0 },
  { id: "682", name: "Saudi Arabia", flag: "🇸🇦", cpi: 1.4, delta: -0.1 },
  { id: "756", name: "Switzerland", flag: "🇨🇭", cpi: 1.2, delta: 0.0 },
  { id: "764", name: "Thailand", flag: "🇹🇭", cpi: 1.1, delta: -0.1 },
];

/** Deduplicated lookup keyed by ISO numeric id. */
const byId = new Map<string, InflationCountry>();
for (const c of inflationCountries) {
  if (!byId.has(c.id)) byId.set(c.id, c);
}

export const inflationById: ReadonlyMap<string, InflationCountry> = byId;

export function fmtPctPoint(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
}
