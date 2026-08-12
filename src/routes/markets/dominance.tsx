import { createFileRoute } from "@tanstack/react-router";
import { PieChart } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { BitcoinDominanceContent } from "@/components/market/pages/bitcoin-dominance";

export const Route = createFileRoute("/markets/dominance")({
  head: () => ({
    meta: [
      { title: "Bitcoin Dominance — Cryptolytic" },
      {
        name: "description",
        content:
          "Bitcoin and Ethereum dominance trends with historical context and market interpretation — on the homepage.",
      },
      { property: "og:title", content: "Bitcoin Dominance — Cryptolytic" },
    ],
  }),
  component: MarketsDominancePage,
});

function MarketsDominancePage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Bitcoin Dominance"
        subtitle="Capital distribution across the market — BTC, ETH and the rest"
        icon={PieChart}
        consoleTo="/ai-analysis"
      />
      <BitcoinDominanceContent />
    </MarketingLayout>
  );
}
