"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";

import type { Step } from "../types";

type Props = {
  hasMissingRequiredSteps: boolean;
  missingRequiredSteps: Step[];
  firstMissingRequiredStep: Step | undefined;
  onJumpToStep: (key: Step["key"]) => void;
  reviewDescription: string;
  showBillingCta: boolean;
  billingCtaLabel: string;
  navigatingToBilling: boolean;
  onActivate: () => void;
};

export function ReviewStep({
  hasMissingRequiredSteps,
  missingRequiredSteps,
  firstMissingRequiredStep,
  onJumpToStep,
  reviewDescription,
  showBillingCta,
  billingCtaLabel,
  navigatingToBilling,
  onActivate,
}: Props) {
  if (hasMissingRequiredSteps) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Almost there</h2>
        <p className="text-sm text-slate-600">
          Finish {missingRequiredSteps.map((step) => step.title).join(", ")} to complete setup.
        </p>
        <div className="flex justify-center gap-3">
          {firstMissingRequiredStep ? (
            <Button onClick={() => onJumpToStep(firstMissingRequiredStep.key)}>
              Continue {firstMissingRequiredStep.title}
            </Button>
          ) : null}
          <Link href="/account">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Onboarding complete</h2>
      <p className="text-sm text-slate-600">{reviewDescription}</p>
      <div className="flex justify-center gap-3">
        {showBillingCta ? (
          <Button onClick={onActivate} disabled={navigatingToBilling}>
            {navigatingToBilling ? "Loading..." : billingCtaLabel}
          </Button>
        ) : (
          <Link href="/account">
            <Button>Go to Dashboard</Button>
          </Link>
        )}
        {!showBillingCta ? (
          <Link href="/account/profile">
            <Button variant="outline">Review Profile</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export type { Props as ReviewStepProps };
