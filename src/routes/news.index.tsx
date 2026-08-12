import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import {
  VideoShowcase,
  LiveMarketsStrip,
  FinnhubRealtimeSection,
} from "@/components/market/new-content";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "News — Cryptolytic" },
      {
        name: "description",
        content:
          "What's new in the market, inside the terminal — live prices, economic calendar, fundamentals and headlines.",
      },
      { property: "og:title", content: "News — Cryptolytic" },
    ],
  }),
  component: NewsPage,
});

/**
 * The console's News page — the homepage's "New" feed brought inside the
 * terminal. It renders the exact same components (and therefore the same Data
 * API) as the marketing /new page, but stays inside the console: the hero CTA
 * jumps to the console market overview instead of the homepage tabs. Clicking
 * "News" here never leaves the terminal, and clicking "New" on the homepage
 * never opens the console — one data source, two destinations.
 */
function NewsPage() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const top = assets.slice(0, 6);
  const movers = [...assets].sort((a, b) => b.change24h - a.change24h).slice(0, 6);

  return (
    <AppShell title="News" subtitle="What's new in the market — inside the terminal">
      <div className="space-y-8">
        <VideoShowcase consoleMode />
        <LiveMarketsStrip top={top} stats={globalStats} movers={movers} />
        <FinnhubRealtimeSection />
      </div>
    </AppShell>
  );
}
