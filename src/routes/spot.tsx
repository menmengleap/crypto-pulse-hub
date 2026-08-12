import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console pages (spot, chart, news, …) were consolidated into the
 * chat — old links and bookmarks redirect there. The same spot market UI is
 * still available on the homepage at /markets/spot.
 */
export const Route = createFileRoute("/spot")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
