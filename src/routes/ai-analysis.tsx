import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdvancedChat } from "@/components/chat/advanced-chat";
import { useSessionGate } from "@/lib/api";

export const Route = createFileRoute("/ai-analysis")({
  head: () => ({
    meta: [
      { title: "Advanced Chat — Cryptolytic" },
      {
        name: "description",
        content:
          "The console's Advanced Chat — ask about live prices, movers, fear & greed, dominance, the market cycle, news or a server-side desk note on any asset.",
      },
      { property: "og:title", content: "Advanced Chat — Cryptolytic" },
    ],
  }),
  component: AiAnalysisPage,
});

function AiAnalysisPage() {
  const navigate = useNavigate();
  const { loading: authLoading, authed } = useSessionGate();

  // Gate the render behind mount so the server and first client paint agree
  // (both show the loader) — the guard then runs client-side without an SSR
  // hydration mismatch. Same pattern as AppShell's console gate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!authed) {
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
        replace: true,
      });
    }
  }, [mounted, authLoading, authed, navigate]);

  if (!mounted || authLoading || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return <AdvancedChat />;
}
