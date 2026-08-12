import { createFileRoute } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { PublicMarketPageHeader } from "@/components/market/pages/public-page-header";
import { CryptoAssetsContent } from "@/components/market/pages/crypto-assets";

export const Route = createFileRoute("/markets/assets")({
  head: () => ({
    meta: [
      { title: "Crypto Assets — Cryptolytic" },
      {
        name: "description",
        content:
          "Browse crypto assets by sector with price, market cap, volume, RSI and trend — on the homepage.",
      },
      { property: "og:title", content: "Crypto Assets — Cryptolytic" },
    ],
  }),
  component: MarketsAssetsPage,
});

function MarketsAssetsPage() {
  return (
    <MarketingLayout>
      <PublicMarketPageHeader
        title="Crypto Assets"
        subtitle="The full asset universe by sector — price, market cap, volume and technicals"
        icon={Coins}
        consoleTo="/assets"
      />
      <CryptoAssetsContent variant="public" />
    </MarketingLayout>
  );
}
