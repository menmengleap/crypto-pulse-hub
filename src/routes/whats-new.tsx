import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The console's standalone "New" page was consolidated into the console's
 * "News" page (/news), which now renders the homepage's New feed inside the
 * terminal. Old links and bookmarks to /whats-new are redirected there so
 * nothing breaks — the console stays in the console, never on the homepage.
 */
export const Route = createFileRoute("/whats-new")({
  beforeLoad: () => {
    throw redirect({ to: "/news", replace: true });
  },
});
