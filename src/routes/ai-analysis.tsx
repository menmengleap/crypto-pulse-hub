import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TerminalWorkspace } from "@/components/terminal/terminal-workspace";
import { useSessionGate } from "@/lib/api";

export const Route = createFileRoute("/ai-analysis")({
  head: () => ({
    meta: [
      { title: "Trading Terminal — Cryptolytic" },
      {
        name: "description",
        content:
          "Cryptolytic Professional AI Trading Terminal — full-screen chart with live klines, drawing tools, technical indicators, AI market analysis, screener and market data.",
      },
      { property: "og:title", content: "Trading Terminal — Cryptolytic" },
    ],
  }),
  component: AiAnalysisPage,
});

function AiAnalysisPage() {
  const navigate = useNavigate();
  const { loading: authLoading, authed } = useSessionGate();

  // Gate the render behind mount so the server and first client paint agree
  // (both show the loader) — the guard then runs client-side without an SSR
  // hydration mismatch.
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
      <div className="flex min-h-screen items-center justify-center bg-[#070B12]">
        <span className="size-5 animate-spin rounded-full border-2 border-[#202936] border-t-[#7C8CFF]" />
      </div>
    );
  }

  return <TerminalWorkspace />;
}
