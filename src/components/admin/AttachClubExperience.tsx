"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { apiPut } from "@/lib/api";
import type { ClubPlan, CommunityExperienceOffering } from "@/lib/clubOnboarding";

export function AttachClubExperience({
  plan,
  offerings,
  onSaved,
}: {
  plan: ClubPlan;
  offerings: CommunityExperienceOffering[];
  onSaved: () => void;
}) {
  const [offeringId, setOfferingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const available = offerings.filter(
    (offering) =>
      offering.is_active &&
      offering.currency === plan.currency &&
      offering.period_start === plan.period_start &&
      offering.period_end === plan.period_end
  );
  if (plan.community_experience_offering_id) {
    const offering = offerings.find((item) => item.id === plan.community_experience_offering_id);
    return (
      <p className="mt-3 text-sm text-slate-600">
        Optional Experience: {offering?.name ?? "Linked offering"}
      </p>
    );
  }
  return (
    <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
      <p className="text-sm text-slate-600">
        No Community Experience is offered with this quarter yet.
      </p>
      <label className="block text-sm font-medium">
        Optional Experience for {plan.name}
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 p-2"
          value={offeringId}
          disabled={busy}
          onChange={(event) => setOfferingId(event.target.value)}
        >
          <option value="">Choose a matching offering</option>
          {available.map((offering) => (
            <option key={offering.id} value={offering.id}>
              {offering.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-slate-500">
        Adds an unselected checkout option. Club prices, existing purchases and application choices
        stay unchanged. Its linked Event must be published.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !offeringId}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await apiPut(
              `/api/v1/clubs/admin/plans/${plan.id}/community-experience`,
              { offering_id: offeringId },
              { auth: true }
            );
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not attach Experience");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Attaching…" : "Attach optional Experience"}
      </Button>
    </div>
  );
}
