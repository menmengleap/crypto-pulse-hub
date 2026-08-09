import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { LegalDoc, LegalSection } from "@/components/layout/legal-doc";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Cryptolytic" },
      {
        name: "description",
        content: "How Cryptolytic collects, uses and protects your information.",
      },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  return (
    <LegalDoc
      icon={<ShieldCheck className="size-3.5 text-primary" />}
      label="Legal"
      title="Privacy Policy"
      updated="August 9, 2026"
    >
      <LegalSection heading="1. What we collect">
        <p>
          When you create an account we collect your email address and display name. We may collect
          basic usage metrics (pages viewed, features used) to improve the product. We never request
          exchange API keys, wallet addresses or private keys — the terminal is analytics-only by
          design.
        </p>
      </LegalSection>
      <LegalSection heading="2. Local data">
        <p>
          Preferences such as theme, collapsed sidebars and watchlist drafts are stored locally in
          your browser. You can clear this data at any time from your browser settings.
        </p>
      </LegalSection>
      <LegalSection heading="3. Market data requests">
        <p>
          To display live prices and snapshots, your browser talks directly to public market-data
          providers such as Binance and CoinGecko. These requests are made by the terminal on your
          behalf and are subject to those providers' own terms and privacy policies.
        </p>
      </LegalSection>
      <LegalSection heading="4. Cookies & analytics">
        <p>
          We use strictly necessary cookies for authentication and basic analytics to understand
          aggregate usage. We do not sell your personal data, and we do not use advertising
          trackers.
        </p>
      </LegalSection>
      <LegalSection heading="5. How we use your information">
        <p>
          Your information is used to operate your account, deliver the Service, respond to support
          requests, and send service or product updates if you opt in. We do not share personal data
          with third parties except to provide the Service or where required by law.
        </p>
      </LegalSection>
      <LegalSection heading="6. Data retention">
        <p>
          Account data is retained for as long as your account is active. You may request deletion
          of your account and associated data at any time by contacting support.
        </p>
      </LegalSection>
      <LegalSection heading="7. Your rights">
        <p>
          Depending on your jurisdiction you may have rights to access, correct or delete your
          personal data, and to object to or restrict certain processing. To exercise any of these
          rights, contact support@cryptolytic.io.
        </p>
      </LegalSection>
      <LegalSection heading="8. Changes to this policy">
        <p>
          We may update this policy as the Service evolves. Significant changes will be noted on the
          blog. Your continued use of the Service constitutes acceptance of the updated policy.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
