import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { BitcoinDominanceContent } from "@/components/market/pages/bitcoin-dominance";

export const Route = createFileRoute("/dominance")({
  head: () => ({
    meta: [
      { title: "Bitcoin Dominance — Cryptolytic" },
      {
        name: "description",
        content:
          "Bitcoin and Ethereum dominance trends with historical context and market interpretation.",
      },
      { property: "og:title", content: "Bitcoin Dominance — Cryptolytic" },
      {
        property: "og:description",
        content: "Track capital rotation between Bitcoin, Ethereum and altcoins.",
      },
    ],
  }),
  component: DominancePage,
});

function DominancePage() {
  return (
    <AppShell title="Bitcoin Dominance" subtitle="Capital distribution across the market">
      <BitcoinDominanceContent />
    </AppShell>
  );
}
