import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console pages (news, chart, …) were consolidated into the chat —
 * ask the assistant for the latest headlines instead. Old links redirect here.
 */
export const Route = createFileRoute("/news/")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
