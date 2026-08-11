import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import {
  VideoShowcase,
  LiveMarketsStrip,
  FinnhubRealtimeSection,
} from "@/components/market/new-content";
import { useLiveAssets, useLiveGlobal } from "@/lib/realtime";

export const Route = createFileRoute("/whats-new")({
  head: () => ({
    meta: [
      { title: "New — Cryptolytic" },
      {
        name: "description",
        content:
          "Live markets and the latest research panels inside the terminal — the same data as the homepage.",
      },
      { property: "og:title", content: "New — Cryptolytic" },
    ],
  }),
  component: WhatsNewPage,
});

/**
 * The console's own "New" page — the New Homepage content brought inside the
 * terminal. It renders the exact same components (and therefore the same Data
 * API) as the marketing /new page, but stays inside the console: the hero CTA
 * jumps to the console market overview instead of the homepage tabs.
 */
function WhatsNewPage() {
  const assets = useLiveAssets();
  const globalStats = useLiveGlobal();
  const top = assets.slice(0, 6);
  const movers = [...assets].sort((a, b) => b.change24h - a.change24h).slice(0, 6);

  return (
    <AppShell title="New" subtitle="What's live in the market right now — from the terminal">
      <div className="space-y-8">
        <VideoShowcase consoleMode />
        <LiveMarketsStrip top={top} stats={globalStats} movers={movers} />
        <FinnhubRealtimeSection />
      </div>
    </AppShell>
  );
}
