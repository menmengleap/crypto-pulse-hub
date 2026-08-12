import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { SpotMarketContent } from "@/components/market/pages/spot-market";

export const Route = createFileRoute("/spot")({
  head: () => ({
    meta: [
      { title: "Spot Market — Cryptolytic" },
      {
        name: "description",
        content: "Spot market pairs with live prices, 24h change, volume and trend classification.",
      },
      { property: "og:title", content: "Spot Market — Cryptolytic" },
      {
        property: "og:description",
        content: "Track spot pairs, volume and trend across the crypto market.",
      },
    ],
  }),
  component: SpotPage,
});

function SpotPage() {
  return (
    <AppShell title="Spot Market" subtitle="USDT-quoted spot pairs">
      <SpotMarketContent />
    </AppShell>
  );
}
