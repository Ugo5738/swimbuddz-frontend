"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { prepareAcademyEnrollment } from "@/lib/checkoutPreparation";
import { Alert } from "@/components/ui/Alert";
import { Cohort, formatCurrency, useUpgrade } from "@/lib/upgradeContext";
import { AlertCircle, Calendar, GraduationCap, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LateJoinDisclosureModal,
  LateJoinPreferences,
  computeLateJoinContext,
} from "./LateJoinDisclosureModal";

// TEMP FLAG (re-enable 2026-05-24 / "in 2 days"):
//   Flip to `true` to restore the late-join disclosure flow — the amber badge
//   on mid-cohort cards AND the modal that fires when the member clicks
//   Continue. All other plumbing (modal component, upgrade context, checkout
//   payload, admin/coach prefs view) is intentionally left intact so this is
//   a single-line revert.
const LATE_JOIN_DISCLOSURE_ENABLED = false;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AcademyCohortSelectionPage() {
  const router = useRouter();
  const { state, setSelectedCohort, setTargetTier, setLateJoinPreferences } = useUpgrade();

  const { data, loading, error } = useApi<Cohort[]>("/api/v1/academy/cohorts/enrollable");
  const cohorts = data ?? [];
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(state.selectedCohortId);
  // Cohort that triggered the late-join modal; null when modal is closed.
  const [lateJoinFor, setLateJoinFor] = useState<Cohort | null>(null);

  // Set target tier on mount
  useEffect(() => {
    setTargetTier("academy");
  }, [setTargetTier]);

  const handleSelectCohort = (cohort: Cohort) => {
    setSelectedId(cohort.id);
  };

  const proceedToCheckout = async (cohort: Cohort, prefs?: LateJoinPreferences) => {
    if (preparing) return;
    setPreparing(true); setPrepareError(null);
    setSelectedCohort(cohort);
    try {
      const prepared = await prepareAcademyEnrollment(cohort.id, prefs);
      router.push(prepared.path);
    } catch (e) {
      setPrepareError(e instanceof Error ? e.message : "Could not prepare checkout");
      setPreparing(false);
    }
  };

  const handleContinue = () => {
    const cohort = cohorts.find((c) => c.id === selectedId);
    if (!cohort) return;

    // Intercept mid-cohort joins with a disclosure modal. The modal calls
    // proceedToCheckout once the member has acknowledged & supplied their
    // make-up availability preferences.
    if (LATE_JOIN_DISCLOSURE_ENABLED) {
      const ctx = computeLateJoinContext(cohort);
      if (ctx.isLateJoin) {
        setLateJoinFor(cohort);
        return;
      }
    }

    // Clear any stale late-join prefs from a previously-selected cohort.
    setLateJoinPreferences(null);
    proceedToCheckout(cohort);
  };

  const handleLateJoinContinue = (prefs: LateJoinPreferences) => {
    if (!lateJoinFor) return;
    setLateJoinPreferences(prefs);
    const cohort = lateJoinFor;
    setLateJoinFor(null);
    void proceedToCheckout(cohort, prefs);
  };

  if (loading) {
    return <LoadingCard text="Loading available cohorts..." />;
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  if (cohorts.length === 0) {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">No Open Cohorts</h1>
        <p className="text-slate-600 max-w-md mx-auto">
          There are no Academy cohorts accepting enrollments right now. New cohorts are announced
          regularly — check back soon!
        </p>
        <Button variant="secondary" onClick={() => router.push("/account/billing")}>
          Back to Billing
        </Button>
      </div>
    );
  }

  const selectedCohort = cohorts.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-white">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Choose Your Cohort</h1>
        <p className="text-slate-600 max-w-md mx-auto">
          Select which Academy cohort you'd like to join. Each cohort has its own schedule and focus
          area.
        </p>
      </div>

      {/* Cohort Cards */}
      <div className="grid gap-4">
        {cohorts.map((cohort) => {
          const isSelected = selectedId === cohort.id;
          const ctx = computeLateJoinContext(cohort);

          return (
            <button
              key={cohort.id}
              type="button"
              onClick={() => handleSelectCohort(cohort)}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? "border-purple-500 bg-purple-50 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{cohort.name}</h3>
                  {cohort.program_name && (
                    <p className="text-sm text-slate-500 mt-0.5">{cohort.program_name}</p>
                  )}

                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                    {cohort.start_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>Starts {formatDate(cohort.start_date)}</span>
                      </div>
                    )}
                    {cohort.end_date && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Ends {formatDate(cohort.end_date)}</span>
                      </div>
                    )}
                  </div>

                  {LATE_JOIN_DISCLOSURE_ENABLED && ctx.isLateJoin && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>
                        Joining Week {ctx.weeksElapsed + 1} • {ctx.sessionsMissed} make-up
                        {ctx.sessionsMissed === 1 ? "" : "s"} required
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  {(() => {
                    // Use price_override if set, otherwise use program.price_amount
                    // Price is stored in naira (major unit)
                    const price = cohort.price_override ?? cohort.program?.price_amount;
                    if (price !== undefined && price > 0) {
                      return (
                        <div className="text-xl font-bold text-purple-600">
                          {formatCurrency(price)}
                        </div>
                      );
                    }
                    return <div className="text-sm text-slate-500">Price TBD</div>;
                  })()}
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      {selectedCohort && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>Selected:</strong> {selectedCohort.name}
            {(() => {
              const price = selectedCohort.price_override ?? selectedCohort.program?.price_amount;
              return price && price > 0 ? ` • ${formatCurrency(price)}` : "";
            })()}
          </p>
        </Card>
      )}

      {prepareError && <Alert variant="error">{prepareError}</Alert>}
      {/* Continue button */}
      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={!selectedId || preparing} size="lg">
          {preparing ? "Preparing checkout…" : "Continue to Checkout"}
        </Button>
      </div>

      {lateJoinFor && (
        <LateJoinDisclosureModal
          isOpen={true}
          onClose={() => setLateJoinFor(null)}
          onContinue={handleLateJoinContinue}
          cohort={lateJoinFor}
          context={computeLateJoinContext(lateJoinFor)}
        />
      )}
    </div>
  );
}
