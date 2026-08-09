import { createFileRoute } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Analysis — Cryptolytic" },
      { name: "description", content: "Saved Analysis is coming soon to Cryptolytic." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  return (
    <AppShell title="Saved Analysis" subtitle="Your research notes, in one place">
      <ComingSoon
        icon={Bookmark}
        title="Saved Analysis is coming soon"
        description="Keep every dated analysis, chart note and watchlist insight in one tidy workspace. This workspace ships in an upcoming release."
      />
    </AppShell>
  );
}
