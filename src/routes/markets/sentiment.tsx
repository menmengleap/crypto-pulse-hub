import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { MarketSentimentContent } from "@/components/market/pages/market-sentiment";

export const Route = createFileRoute("/markets/sentiment")({
  head: () => ({
    meta: [
      { title: "Market Sentiment — Cryptolytic" },
      {
        name: "description",
        content:
          "Composite crypto market sentiment from spot flows, funding, social activity and on-chain accumulation — on the homepage.",
      },
      { property: "og:title", content: "Market Sentiment — Cryptolytic" },
    ],
  }),
  component: MarketsSentimentPage,
});

function MarketsSentimentPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Market Sentiment"
        subtitle="Composite positioning signal — spot flows, funding, social and on-chain"
        icon={Activity}
        consoleTo="/ai-analysis"
      />
      <MarketSentimentContent />
    </MarketingLayout>
  );
}
