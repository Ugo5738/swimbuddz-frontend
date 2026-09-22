"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useApi } from "@/hooks/useApi";

type CohortOption = { id: string; name: string; status: string };
type Props = {
  cohortId: string | null;
  feeMode: "included" | "paid_extra";
  onCohortChange: (id: string | null) => void;
  onFeeModeChange: (mode: "included" | "paid_extra") => void;
};

export function AcademyTemplateFields({
  cohortId,
  feeMode,
  onCohortChange,
  onFeeModeChange,
}: Props) {
  const { data, loading, error, refetch } = useApi<CohortOption[]>("/api/v1/academy/cohorts");
  const cohorts = (data ?? []).filter(
    (cohort) => cohort.id === cohortId || !["completed", "cancelled"].includes(cohort.status)
  );
  return (
    <>
      <Select
        label="Cohort"
        value={cohortId ?? ""}
        onChange={(event) => onCohortChange(event.target.value || null)}
        required
        disabled={loading || Boolean(error)}
        hint="Every generated class belongs to this cohort. Only eligible enrolled students can book."
      >
        <option value="">{loading ? "Loading cohorts…" : "Choose a cohort"}</option>
        {cohortId && !cohorts.some((cohort) => cohort.id === cohortId) && (
          <option value={cohortId} disabled>
            Saved cohort unavailable — choose a cohort
          </option>
        )}
        {cohorts.map((cohort) => (
          <option key={cohort.id} value={cohort.id}>
            {cohort.name}
          </option>
        ))}
      </Select>
      {error && (
        <div role="alert" className="text-sm text-rose-700">
          Could not load cohorts. {error}
          <Button type="button" variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}
      <Select
        label="Class payment"
        value={feeMode}
        onChange={(event) => onFeeModeChange(event.target.value as Props["feeMode"])}
      >
        <option value="included">Included in tuition / no extra charge</option>
        <option value="paid_extra">Paid extra class — charge separately</option>
      </Select>
      <p className="text-sm text-slate-600">
        {feeMode === "paid_extra"
          ? "Each student pays the booking price below for each extra class. Booking is confirmed after payment."
          : "Regular classes are already covered by tuition. Enrolled students pay ₦0 to book, regardless of the operating price below."}
      </p>
    </>
  );
}
