import { createFileRoute } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { FearGreedContent } from "@/components/market/pages/fear-greed";

export const Route = createFileRoute("/markets/fear-greed")({
  head: () => ({
    meta: [
      { title: "Fear & Greed Index — Cryptolytic" },
      {
        name: "description",
        content:
          "Crypto Fear & Greed index with current score, 7-day and 30-day history and market interpretation — on the homepage.",
      },
      { property: "og:title", content: "Fear & Greed Index — Cryptolytic" },
    ],
  }),
  component: MarketsFearGreedPage,
});

function MarketsFearGreedPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Fear & Greed"
        subtitle="Market emotion index — from extreme fear to extreme greed, updated hourly"
        icon={Gauge}
        consoleTo="/fear-greed"
      />
      <FearGreedContent />
    </MarketingLayout>
  );
}
