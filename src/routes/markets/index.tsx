import { createFileRoute, redirect } from "@tanstack/react-router";

/** /markets → the public Market Overview page (homepage market hub). */
export const Route = createFileRoute("/markets/")({
  beforeLoad: () => {
    throw redirect({ to: "/markets/overview", replace: true });
  },
});
