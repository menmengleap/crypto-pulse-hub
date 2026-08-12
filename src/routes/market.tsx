import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { MarketOverviewContent } from "@/components/market/pages/market-overview";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market Overview — Cryptolytic" },
      {
        name: "description",
        content:
          "Live markets across crypto, stocks and forex: prices, market cap, dominance, sentiment, open interest and trending assets.",
      },
      { property: "og:title", content: "Market Overview — Cryptolytic" },
      {
        property: "og:description",
        content:
          "A dense dashboard of crypto, stock and forex market structure, sentiment and flows.",
      },
    ],
  }),
  component: MarketOverview,
});

function MarketOverview() {
  return (
    <AppShell title="Market Overview" subtitle="Crypto, stocks & forex — real-time market flows">
      <MarketOverviewContent />
    </AppShell>
  );
}
