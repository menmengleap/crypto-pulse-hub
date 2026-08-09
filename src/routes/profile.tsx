import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Cryptolytic" },
      { name: "description", content: "Profile is coming soon to Cryptolytic." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell title="Profile" subtitle="Account details & preferences">
      <ComingSoon
        icon={User}
        title="Profile is coming soon"
        description="Manage your account details, preferences and connected workspaces here. This page ships in an upcoming release."
      />
    </AppShell>
  );
}
