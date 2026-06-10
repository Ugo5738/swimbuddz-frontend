import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingPage } from "@/components/ui/LoadingSpinner";
import FoundingMembersClient from "./FoundingMembersClient";

// Stroke Lab founding-members pre-sale landing page.
//
// Sold up to 100 lifetime memberships at ₦20,000 each. Public route so
// the page renders for unauthenticated visitors (marketing); the actual
// claim flow requires auth and runs in the client component.

export const metadata: Metadata = {
  title: "Stroke Lab Founding Members | SwimBuddz",
  description:
    "Lock in lifetime access to Stroke Lab — SwimBuddz's AI freestyle technique check. ₦20,000, capped at 100 founders.",
  openGraph: {
    title: "Stroke Lab Founding Members | SwimBuddz",
    description:
      "Lifetime access to Stroke Lab — SwimBuddz's AI freestyle technique check. ₦20,000, capped at 100.",
    type: "website",
  },
};

export default function FoundingMembersPage() {
  // useSearchParams (Paystack ?reference= return) requires a Suspense boundary.
  return (
    <Suspense fallback={<LoadingPage />}>
      <FoundingMembersClient />
    </Suspense>
  );
}
