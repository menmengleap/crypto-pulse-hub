import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console pages (screener, chart, news, …) were consolidated into
 * the chat — old links and bookmarks redirect there.
 */
export const Route = createFileRoute("/screener")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
