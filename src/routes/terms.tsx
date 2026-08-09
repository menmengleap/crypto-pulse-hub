import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { LegalDoc, LegalSection } from "@/components/layout/legal-doc";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Cryptolytic" },
      {
        name: "description",
        content: "The terms that govern your use of the Cryptolytic market intelligence terminal.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalDoc
      icon={<FileText className="size-3.5 text-primary" />}
      label="Legal"
      title="Terms of Service"
      updated="August 9, 2026"
    >
      <LegalSection heading="1. Acceptance of terms">
        <p>
          By accessing or using Cryptolytic ("the Service"), you agree to be bound by these Terms of
          Service. If you do not agree to any part of these terms, you may not use the Service.
        </p>
      </LegalSection>
      <LegalSection heading="2. What the Service is">
        <p>
          Cryptolytic is an analytics-only market intelligence terminal. It displays market data,
          technical indicators, sentiment signals, news and AI-assisted commentary. The Service does
          not execute trades, does not connect to exchange accounts, and does not hold or move funds
          on your behalf.
        </p>
      </LegalSection>
      <LegalSection heading="3. Accounts">
        <p>
          Some features require an account. You are responsible for keeping your credentials
          confidential and for all activity that occurs under your account. You agree to provide
          accurate information when registering and to notify us of any unauthorized use.
        </p>
      </LegalSection>
      <LegalSection heading="4. Acceptable use">
        <p>
          You agree not to misuse the Service: scraping at abusive rates, attempting to disrupt or
          overload our infrastructure, reverse-engineering the platform, or using it for unlawful
          purposes. We may suspend accounts that violate these rules.
        </p>
      </LegalSection>
      <LegalSection heading="5. Subscriptions & billing">
        <p>
          Paid plans are billed monthly or yearly in advance and renew automatically until
          cancelled. You can downgrade or cancel at any time from your workspace; access continues
          until the end of the paid period. Fees are non-refundable except where required by law.
        </p>
      </LegalSection>
      <LegalSection heading="6. Intellectual property">
        <p>
          The Service, including its interface, design and original content, is owned by Cryptolytic
          and protected by intellectual property laws. You may use the Service for your own analysis
          but may not reproduce or redistribute its proprietary material without permission.
        </p>
      </LegalSection>
      <LegalSection heading="7. Disclaimers">
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind. We do
          not guarantee that data is complete, accurate or delivered without interruption. Market
          data may be delayed, and some feeds are simulated while live sources are offline. Nothing
          on the platform constitutes financial advice (see the Economic Disclaimer).
        </p>
      </LegalSection>
      <LegalSection heading="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Cryptolytic shall not be liable for any indirect,
          incidental or consequential damages arising from your use of the Service, including
          trading losses. Your sole remedy for dissatisfaction is to stop using the Service.
        </p>
      </LegalSection>
      <LegalSection heading="9. Changes to these terms">
        <p>
          We may update these terms from time to time. Material changes will be announced on the
          blog. Continued use of the Service after changes take effect constitutes acceptance of the
          revised terms.
        </p>
      </LegalSection>
      <LegalSection heading="10. Contact">
        <p>Questions about these terms can be sent to support@cryptolytic.io.</p>
      </LegalSection>
    </LegalDoc>
  );
}
