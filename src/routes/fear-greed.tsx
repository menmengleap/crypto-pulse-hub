import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { FearGreedContent } from "@/components/market/pages/fear-greed";

export const Route = createFileRoute("/fear-greed")({
  head: () => ({
    meta: [
      { title: "Fear & Greed Index — Cryptolytic" },
      {
        name: "description",
        content:
          "Crypto Fear & Greed index with current score, 7-day and 30-day history and market interpretation.",
      },
      { property: "og:title", content: "Fear & Greed Index — Cryptolytic" },
      {
        property: "og:description",
        content: "Track crypto market emotion from extreme fear to extreme greed.",
      },
    ],
  }),
  component: FearGreedPage,
});

function FearGreedPage() {
  return (
    <AppShell title="Fear & Greed" subtitle="Market emotion index">
      <FearGreedContent />
    </AppShell>
  );
}
