import {
  Activity,
  BarChart3,
  Coins,
  Gauge,
  GitCompareArrows,
  Grid2x2,
  Layers,
  LayoutDashboard,
  PieChart,
  Waves,
  type LucideIcon,
} from "lucide-react";

/**
 * The ten market tool pages, shared between the console (authenticated
 * terminal, paths under /market, /spot, …) and the public homepage (marketing
 * pages under /markets/*, rendered with the exact same UI).
 *
 * Clicking a page from the console keeps you in the console; clicking it from
 * the homepage keeps you on the homepage — one UI, two destinations.
 */
export type MarketPage = {
  label: string;
  /** Console path — same UI inside the terminal (auth-gated). */
  consoleTo: string;
  /** Public homepage path — same UI on the marketing site. */
  publicTo: string;
  icon: LucideIcon;
  group: "Markets" | "Intelligence" | "Research";
};

export const marketPages: MarketPage[] = [
  {
    label: "Market Overview",
    consoleTo: "/market",
    publicTo: "/markets/overview",
    icon: LayoutDashboard,
    group: "Markets",
  },
  {
    label: "Spot Market",
    consoleTo: "/spot",
    publicTo: "/markets/spot",
    icon: BarChart3,
    group: "Markets",
  },
  {
    label: "Derivatives Market",
    consoleTo: "/derivatives",
    publicTo: "/markets/derivatives",
    icon: Layers,
    group: "Markets",
  },
  {
    label: "Crypto Assets",
    consoleTo: "/assets",
    publicTo: "/markets/assets",
    icon: Coins,
    group: "Markets",
  },
  {
    label: "Fear & Greed",
    consoleTo: "/fear-greed",
    publicTo: "/markets/fear-greed",
    icon: Gauge,
    group: "Intelligence",
  },
  {
    label: "Market Sentiment",
    consoleTo: "/sentiment",
    publicTo: "/markets/sentiment",
    icon: Activity,
    group: "Intelligence",
  },
  {
    label: "Market Cycle",
    consoleTo: "/cycle",
    publicTo: "/markets/cycle",
    icon: Waves,
    group: "Intelligence",
  },
  {
    label: "Bitcoin Dominance",
    consoleTo: "/dominance",
    publicTo: "/markets/dominance",
    icon: PieChart,
    group: "Intelligence",
  },
  {
    label: "Market Heatmap",
    consoleTo: "/heatmap",
    publicTo: "/markets/heatmap",
    icon: Grid2x2,
    group: "Intelligence",
  },
  {
    label: "Compare",
    consoleTo: "/compare",
    publicTo: "/markets/compare",
    icon: GitCompareArrows,
    group: "Research",
  },
];

export const marketPageGroups = ["Markets", "Intelligence", "Research"] as const;

const CONSOLE_TO_PUBLIC: Record<string, string> = Object.fromEntries(
  marketPages.map((p) => [p.consoleTo, p.publicTo]),
);

/**
 * Resolve a console route to its public homepage equivalent.
 * In console mode the path is returned unchanged; in public mode any of the
 * ten market pages is rewritten to its /markets/* homepage URL so the shared
 * UI never sends a homepage visitor into the auth-gated terminal.
 */
export function marketPublicPath(consolePath: string, mode: "console" | "public"): string {
  if (mode === "console") return consolePath;
  return CONSOLE_TO_PUBLIC[consolePath] ?? consolePath;
}
