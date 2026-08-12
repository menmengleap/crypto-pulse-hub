import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { MarketHeatmapContent } from "@/components/market/pages/market-heatmap";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Market Heatmap — Cryptolytic" },
      {
        name: "description",
        content:
          "Interactive crypto market heatmap grouped by sector with 24h performance and market cap.",
      },
      { property: "og:title", content: "Market Heatmap — Cryptolytic" },
      {
        property: "og:description",
        content: "See where money is moving across crypto sectors at a glance.",
      },
    ],
  }),
  component: HeatmapPage,
});

function HeatmapPage() {
  return (
    <AppShell title="Market Heatmap" subtitle="24h performance by sector">
      <MarketHeatmapContent />
    </AppShell>
  );
}
