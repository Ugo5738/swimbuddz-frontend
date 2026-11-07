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

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Explore programmes & next steps
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/upgrade/club/readiness"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-emerald-300 hover:shadow"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Join Weekly Club</p>
              <p className="text-xs text-slate-500">Structured practices & pods</p>
            </div>
            <span className="text-xs font-bold text-emerald-700">Start Application →</span>
          </Link>
          <Link
            href="/upgrade/academy/cohort"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-purple-300 hover:shadow"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Learn in Academy</p>
              <p className="text-xs text-slate-500">Small-group outcome cohorts</p>
            </div>
            <span className="text-xs font-bold text-purple-700">Browse Cohorts →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export type { Props as ReviewStepProps };
