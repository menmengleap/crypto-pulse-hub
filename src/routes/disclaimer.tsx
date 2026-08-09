import { createFileRoute } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { LegalDoc, LegalSection } from "@/components/layout/legal-doc";

export const Route = createFileRoute("/disclaimer")({
  head: () => ({
    meta: [
      { title: "Economic Disclaimer — Cryptolytic" },
      {
        name: "description",
        content:
          "Cryptolytic provides analytics and research only. Nothing on this platform is financial advice.",
      },
    ],
  }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <LegalDoc
      icon={<TriangleAlert className="size-3.5 text-primary" />}
      label="Legal"
      title="Economic Disclaimer"
      updated="August 9, 2026"
    >
      <LegalSection heading="Not financial advice">
        <p>
          Everything on Cryptolytic — including charts, indicators, sentiment signals, news tags,
          AI-generated commentary and any written analysis — is provided for informational and
          educational purposes only. It is not investment, financial, legal or tax advice, and it is
          not a recommendation, solicitation or offer to buy or sell any asset.
        </p>
      </LegalSection>
      <LegalSection heading="Do your own research">
        <p>
          Market analysis is inherently uncertain. Indicators and AI outputs are opinions based on
          historical and current data; they can be wrong, and past performance never guarantees
          future results. You are solely responsible for your own decisions and should conduct
          independent research and consult a qualified professional before acting.
        </p>
      </LegalSection>
      <LegalSection heading="Data accuracy">
        <p>
          We work hard to keep data accurate and timely, but we cannot guarantee completeness,
          accuracy or real-time availability. Prices may be delayed, and some feeds (notably stocks
          and forex) are simulated while a bundled live source is offline. Always confirm critical
          numbers before making decisions.
        </p>
      </LegalSection>
      <LegalSection heading="Risk of loss">
        <p>
          Trading and holding crypto assets carries substantial risk, including the possible loss of
          your entire principal. Volatility, liquidity, regulatory and counterparty risks are real.
          If you choose to trade, you do so at your own risk, and Cryptolytic accepts no liability
          for any losses incurred.
        </p>
      </LegalSection>
      <LegalSection heading="No fiduciary relationship">
        <p>
          Using the Service does not create a fiduciary, advisory or agency relationship between you
          and Cryptolytic. We analyze markets; we never manage money, custody assets or execute
          orders on your behalf.
        </p>
      </LegalSection>
      <LegalSection heading="Jurisdiction">
        <p>
          This disclaimer is governed by the laws applicable in your jurisdiction to the extent
          permitted. Some jurisdictions restrict the promotion of certain instruments; you are
          responsible for complying with the laws that apply to you.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
