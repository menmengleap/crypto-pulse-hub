import { createFileRoute } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/screener")({
  head: () => ({
    meta: [
      { title: "Screener — Cryptolytic" },
      { name: "description", content: "Screener is coming soon to Cryptolytic." },
    ],
  }),
  component: ScreenerPage,
});

function ScreenerPage() {
  return (
    <AppShell title="Screener" subtitle="Multi-condition market scans">
      <ComingSoon
        icon={Filter}
        title="Screener is coming soon"
        description="Build multi-condition scans across price, volume, momentum and fundamentals — then save the results to your watchlist. This workspace ships in an upcoming release."
      />
    </AppShell>
  );
}
