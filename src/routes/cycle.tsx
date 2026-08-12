import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { MarketCycleContent } from "@/components/market/pages/market-cycle";

export const Route = createFileRoute("/cycle")({
  head: () => ({
    meta: [
      { title: "Market Cycle — Cryptolytic" },
      {
        name: "description",
        content:
          "Identify the current crypto market cycle phase with structural and on-chain context.",
      },
      { property: "og:title", content: "Market Cycle — Cryptolytic" },
      { property: "og:description", content: "Where the crypto market sits in its broader cycle." },
    ],
  }),
  component: CyclePage,
});

function CyclePage() {
  return (
    <AppShell title="Market Cycle" subtitle="Cycle phase and structural context">
      <MarketCycleContent />
    </AppShell>
  );
}
