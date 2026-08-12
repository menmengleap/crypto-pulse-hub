import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { MarketOverviewContent } from "@/components/market/pages/market-overview";

export const Route = createFileRoute("/markets/overview")({
  head: () => ({
    meta: [
      { title: "Market Overview — Cryptolytic" },
      {
        name: "description",
        content:
          "Live markets across crypto, stocks and forex: prices, market cap, dominance, sentiment, open interest and trending assets — on the homepage.",
      },
      { property: "og:title", content: "Market Overview — Cryptolytic" },
    ],
  }),
  component: MarketsOverviewPage,
});

function MarketsOverviewPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Market Overview"
        subtitle="Crypto, stocks & forex — real-time market flows, right on the homepage"
        icon={LayoutDashboard}
        consoleTo="/ai-analysis"
      />
      <MarketOverviewContent variant="public" />
    </MarketingLayout>
  );
}
