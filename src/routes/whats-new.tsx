import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console "New" page was consolidated into the chat along with
 * every other console page — old links and bookmarks redirect there.
 */
export const Route = createFileRoute("/whats-new")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
