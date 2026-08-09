import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { MarketingLayout } from "@/components/layout/marketing-layout";
import { ComingSoon } from "@/components/layout/coming-soon";

export const Route = createFileRoute("/coming-soon")({
  head: () => ({
    meta: [
      { title: "Coming soon — Cryptolytic" },
      {
        name: "description",
        content: "Paid Cryptolytic plans are coming soon. Start with the free plan today.",
      },
      { property: "og:title", content: "Paid plans coming soon — Cryptolytic" },
    ],
  }),
  component: ComingSoonPage,
});

function ComingSoonPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-3xl">
        <ComingSoon
          icon={CreditCard}
          title="Paid plans are coming soon"
          description="Checkout for Starter and Advance is in the works. The Free plan is available today — start with it, and upgrade the moment paid plans ship."
        />
      </div>
    </MarketingLayout>
  );
}
