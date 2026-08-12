import { createFileRoute } from "@tanstack/react-router";
import { Waves } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { MarketCycleContent } from "@/components/market/pages/market-cycle";

export const Route = createFileRoute("/markets/cycle")({
  head: () => ({
    meta: [
      { title: "Market Cycle — Cryptolytic" },
      {
        name: "description",
        content:
          "Identify the current crypto market cycle phase with structural and on-chain context — on the homepage.",
      },
      { property: "og:title", content: "Market Cycle — Cryptolytic" },
    ],
  }),
  component: MarketsCyclePage,
});

function MarketsCyclePage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Market Cycle"
        subtitle="Cycle phase and structural context — where the market sits in its broader cycle"
        icon={Waves}
        consoleTo="/cycle"
      />
      <MarketCycleContent />
    </MarketingLayout>
  );
}
