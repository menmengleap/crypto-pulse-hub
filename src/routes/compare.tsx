import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { CompareAssetsContent } from "@/components/market/pages/compare-assets";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare Assets — Cryptolytic" },
      {
        name: "description",
        content:
          "Compare two crypto assets side by side across price, performance, volume and technicals.",
      },
      { property: "og:title", content: "Compare Assets — Cryptolytic" },
      {
        property: "og:description",
        content: "Side-by-side crypto asset comparison for relative strength analysis.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  return (
    <AppShell title="Compare" subtitle="Relative strength between two assets">
      <CompareAssetsContent />
    </AppShell>
  );
}
