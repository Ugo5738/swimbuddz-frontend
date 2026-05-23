import type { Metadata } from "next";

import { CorporateLeadForm } from "@/components/corporate/CorporateLeadForm";
import {
  HeroSection,
  LogisticsSection,
  OutcomesSection,
  PricingSection,
  RippleSection,
  WhatEmployeesGetSection,
  WhySwimmingSection,
} from "@/components/corporate/CorporateLandingSections";
import { Card } from "@/components/ui/Card";

// Marketing landing page for the SwimBuddz Corporate Wellness program.
//
// Mirrors the outward-facing pitch in docs/marketing/CORPORATE_WELLNESS.md.
// The intake form posts to /api/v1/corporate/leads (public, rate-limited,
// honeypot) which creates a CorporateContact with source=inbound_web that
// the admin sees in the pipeline view.

export const metadata: Metadata = {
  title: "Corporate Wellness | SwimBuddz",
  description:
    "12-week adult swim program for working professionals in Lagos. The wellness benefit your team actually finishes.",
  openGraph: {
    title: "Corporate Wellness | SwimBuddz",
    description:
      "12-week adult swim program for working professionals in Lagos. The wellness benefit your team actually finishes.",
    type: "website",
  },
};

export default function CorporatePage() {
  return (
    <main className="bg-white">
      <HeroSection />
      <WhatEmployeesGetSection />
      <WhySwimmingSection />
      <RippleSection />
      <PricingSection />
      <LogisticsSection />
      <OutcomesSection />

      <section
        id="intake"
        className="mx-auto max-w-3xl px-4 py-16 sm:py-20"
      >
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Get started
        </h2>
        <p className="mt-3 text-slate-700">
          Tell us a little about your team and we&apos;ll walk you through
          the curriculum, confirm pool fit, and answer questions in a 20-min
          call. No pressure, no pitch deck.
        </p>
        <Card className="mt-6">
          <CorporateLeadForm />
        </Card>
        <p className="mt-6 text-sm text-slate-500">
          Prefer email or WhatsApp? Reach Daniel directly:{" "}
          <a
            className="text-sky-700 underline underline-offset-2"
            href="mailto:swimbuddz@gmail.com"
          >
            swimbuddz@gmail.com
          </a>{" "}
          ·{" "}
          <a
            className="text-sky-700 underline underline-offset-2"
            href="https://wa.me/2347033588400"
            target="_blank"
            rel="noreferrer"
          >
            +234 703 358 8400
          </a>
        </p>
      </section>
    </main>
  );
}
