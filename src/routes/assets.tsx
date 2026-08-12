import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { CryptoAssetsContent } from "@/components/market/pages/crypto-assets";

export const Route = createFileRoute("/assets")({
  head: () => ({
    meta: [
      { title: "Crypto Assets — Cryptolytic" },
      {
        name: "description",
        content: "Browse crypto assets by sector with price, market cap, volume, RSI and trend.",
      },
      { property: "og:title", content: "Crypto Assets — Cryptolytic" },
      {
        property: "og:description",
        content: "Explore the crypto asset universe by sector and technical state.",
      },
    ],
  }),
  component: AssetsPage,
});

function AssetsPage() {
  return (
    <AppShell title="Crypto Assets" subtitle="The full asset universe by sector">
      <CryptoAssetsContent />
    </AppShell>
  );
}
