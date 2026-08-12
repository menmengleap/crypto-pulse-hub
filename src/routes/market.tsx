import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console pages (market overview, chart, news, …) were consolidated
 * into the chat — old links and bookmarks redirect there. The same market
 * overview UI is still available on the homepage at /markets/overview.
 */
export const Route = createFileRoute("/market")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
