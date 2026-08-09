import { createFileRoute } from "@tanstack/react-router";
import { Brain } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/ai-analysis")({
  head: () => ({
    meta: [
      { title: "AI Analysis — Cryptolytic" },
      { name: "description", content: "AI Analysis is coming soon to Cryptolytic." },
    ],
  }),
  component: AiAnalysisPage,
});

function AiAnalysisPage() {
  return (
    <AppShell title="AI Analysis" subtitle="Desk-style reads on any asset">
      <ComingSoon
        icon={Brain}
        title="AI Analysis is coming soon"
        description="Multi-timeframe reads on trend, momentum and key levels — written like a desk note, not a chatbot. This workspace ships in an upcoming release."
      />
    </AppShell>
  );
}
