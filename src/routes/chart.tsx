import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console pages (chart, news, …) were consolidated into the chat —
 * ask the assistant about any asset instead. Old links redirect here.
 */
export const Route = createFileRoute("/chart")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
