import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { DerivativesMarketContent } from "@/components/market/pages/derivatives-market";

export const Route = createFileRoute("/derivatives")({
  head: () => ({
    meta: [
      { title: "Derivatives Market — Cryptolytic" },
      {
        name: "description",
        content:
          "Perpetual futures analytics: open interest, funding rates, long/short ratio and liquidation context.",
      },
      { property: "og:title", content: "Derivatives Market — Cryptolytic" },
      {
        property: "og:description",
        content: "Open interest, funding and positioning across crypto perpetuals.",
      },
    ],
  }),
  component: DerivativesPage,
});

function DerivativesPage() {
  return (
    <AppShell title="Derivatives Market" subtitle="Perpetual futures positioning and flow">
      <DerivativesMarketContent />
    </AppShell>
  );
}
