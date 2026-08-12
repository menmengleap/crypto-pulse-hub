import { createFileRoute } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { CompareAssetsContent } from "@/components/market/pages/compare-assets";

export const Route = createFileRoute("/markets/compare")({
  head: () => ({
    meta: [
      { title: "Compare Assets — Cryptolytic" },
      {
        name: "description",
        content:
          "Compare two crypto assets side by side across price, performance, volume and technicals — on the homepage.",
      },
      { property: "og:title", content: "Compare Assets — Cryptolytic" },
    ],
  }),
  component: MarketsComparePage,
});

function MarketsComparePage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Compare"
        subtitle="Relative strength between two assets — side by side"
        icon={GitCompareArrows}
        consoleTo="/compare"
      />
      <CompareAssetsContent />
    </MarketingLayout>
  );
}
