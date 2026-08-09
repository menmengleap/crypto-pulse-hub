import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Cryptolytic" },
      { name: "description", content: "Alerts are coming soon to Cryptolytic." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <AppShell title="Alerts" subtitle="Price, indicator and research alerts">
      <ComingSoon
        icon={Bell}
        title="Alerts are coming soon"
        description="Set price levels, indicator triggers and research reminders — delivered in-app and by email. This workspace ships in an upcoming release."
      />
    </AppShell>
  );
}
