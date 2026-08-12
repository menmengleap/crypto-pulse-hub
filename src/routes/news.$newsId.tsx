import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console is now a single full-screen Advanced Chat with live prices.
 * The former console pages (news articles, chart, …) were consolidated into
 * the chat — old links and bookmarks redirect there.
 */
export const Route = createFileRoute("/news/$newsId")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-analysis", replace: true });
  },
});
