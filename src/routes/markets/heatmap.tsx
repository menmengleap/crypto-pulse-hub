import { createFileRoute } from "@tanstack/react-router";
import { Grid2x2 } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { MarketHeatmapContent } from "@/components/market/pages/market-heatmap";

export const Route = createFileRoute("/markets/heatmap")({
  head: () => ({
    meta: [
      { title: "Market Heatmap — Cryptolytic" },
      {
        name: "description",
        content:
          "Interactive crypto market heatmap grouped by sector with 24h performance and market cap — on the homepage.",
      },
      { property: "og:title", content: "Market Heatmap — Cryptolytic" },
    ],
  }),
  component: MarketsHeatmapPage,
});

function MarketsHeatmapPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Market Heatmap"
        subtitle="24h performance by sector — see where money is moving at a glance"
        icon={Grid2x2}
        consoleTo="/heatmap"
      />
      <MarketHeatmapContent />
    </MarketingLayout>
  );
}
