import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { SpotMarketContent } from "@/components/market/pages/spot-market";

export const Route = createFileRoute("/markets/spot")({
  head: () => ({
    meta: [
      { title: "Spot Market — Cryptolytic" },
      {
        name: "description",
        content:
          "Spot market pairs with live prices, 24h change, volume and trend classification — on the homepage.",
      },
      { property: "og:title", content: "Spot Market — Cryptolytic" },
    ],
  }),
  component: MarketsSpotPage,
});

function MarketsSpotPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Spot Market"
        subtitle="USDT-quoted spot pairs with live prices, 24h change, volume and trend"
        icon={BarChart3}
        consoleTo="/ai-analysis"
      />
      <SpotMarketContent variant="public" />
    </MarketingLayout>
  );
}
