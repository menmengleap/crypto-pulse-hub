import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Cryptolytic" },
      { name: "description", content: "Settings are coming soon to Cryptolytic." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Terminal, plan & billing">
      <ComingSoon
        icon={Settings}
        title="Settings are coming soon"
        description="Tune the terminal, manage your plan and billing, and connect your workspaces here. This page ships in an upcoming release."
      />
    </AppShell>
  );
}
