import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { MarketSentimentContent } from "@/components/market/pages/market-sentiment";

export const Route = createFileRoute("/sentiment")({
  head: () => ({
    meta: [
      { title: "Market Sentiment — Cryptolytic" },
      {
        name: "description",
        content:
          "Composite crypto market sentiment from spot flows, funding, social activity and on-chain accumulation.",
      },
      { property: "og:title", content: "Market Sentiment — Cryptolytic" },
      {
        property: "og:description",
        content: "Understand positioning and crowd behaviour across crypto markets.",
      },
    ],
  }),
  component: SentimentPage,
});

function SentimentPage() {
  return (
    <AppShell title="Market Sentiment" subtitle="Composite positioning signal">
      <MarketSentimentContent />
    </AppShell>
  );
}
