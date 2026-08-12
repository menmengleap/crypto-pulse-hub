import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { DerivativesMarketContent } from "@/components/market/pages/derivatives-market";

export const Route = createFileRoute("/markets/derivatives")({
  head: () => ({
    meta: [
      { title: "Derivatives Market — Cryptolytic" },
      {
        name: "description",
        content:
          "Perpetual futures analytics: open interest, funding rates, long/short ratio and liquidation context — on the homepage.",
      },
      { property: "og:title", content: "Derivatives Market — Cryptolytic" },
    ],
  }),
  component: MarketsDerivativesPage,
});

function MarketsDerivativesPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Derivatives Market"
        subtitle="Perpetual futures positioning and flow — open interest, funding and liquidations"
        icon={Layers}
        consoleTo="/ai-analysis"
      />
      <DerivativesMarketContent />
    </MarketingLayout>
  );
}
