"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { AcademyApi, CohortStatus, CohortType, LocationType, type Cohort } from "@/lib/academy";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BasicsSection } from "./BasicsSection";
import { CommercialSection } from "./CommercialSection";
import {
  MS_IN_DAY,
  dateOnlyForTimezone,
  dateShiftDays,
  sameInstant,
  shiftIsoByDays,
} from "./date-utils";
import { EnrollmentRulesSection } from "./EnrollmentRulesSection";
import { LocationSection } from "./LocationSection";
import type { CohortEditValues } from "./types";

type Props = {
  cohort: Cohort;
  onCancel: () => void;
  onSaved: () => void;
};

type SubmitPhase = "idle" | "refreshing" | "previewing" | "applying" | "updating";

export function CohortEditForm({ cohort, onCancel, onSaved }: Props) {
  const submitInFlightRef = useRef(false);
  const cohortTimezone = cohort.timezone || "Africa/Lagos";

  const [values, setValues] = useState<CohortEditValues>({
    name: cohort.name,
    start_date: dateOnlyForTimezone(cohort.start_date, cohortTimezone),
    end_date: dateOnlyForTimezone(cohort.end_date, cohortTimezone),
    capacity: cohort.capacity,
    type: cohort.type ?? CohortType.GROUP,
    status: cohort.status,
    timezone: cohort.timezone || "Africa/Lagos",
    location_type: cohort.location_type || LocationType.POOL,
    pool_id: cohort.pool_id ?? null,
    location_name: cohort.location_name || "",
    location_address: cohort.location_address || "",
    allow_mid_entry: cohort.allow_mid_entry ?? false,
    mid_entry_cutoff_week: cohort.mid_entry_cutoff_week ?? 2,
    require_approval: cohort.require_approval ?? false,
    admin_dropout_approval: cohort.admin_dropout_approval ?? false,
    price_override: cohort.price_override ?? null,
    membership_policy_override: cohort.membership_policy_override ?? null,
    post_graduation_club_bridge_months: cohort.post_graduation_club_bridge_months ?? 0,
    installment_plan_enabled: cohort.installment_plan_enabled ?? false,
    installment_count: cohort.installment_count ?? null,
    installment_deposit_amount: cohort.installment_deposit_amount ?? null,
    notes_internal: cohort.notes_internal || "",
  });

  const [shiftLinkedTimeline, setShiftLinkedTimeline] = useState(true);
  const [shiftReason, setShiftReason] = useState("");
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const originalStartDate = dateOnlyForTimezone(cohort.start_date, cohortTimezone);
  const originalEndDate = dateOnlyForTimezone(cohort.end_date, cohortTimezone);
  const datesChanged =
    values.start_date !== originalStartDate || values.end_date !== originalEndDate;
  const startShiftDays = dateShiftDays(originalStartDate, values.start_date);
  const endShiftDays = dateShiftDays(originalEndDate, values.end_date);
  const hasEqualShiftDelta = startShiftDays === endShiftDays;
  const isWeekAlignedShift = startShiftDays % 7 === 0;

  const currentWeek = useMemo(() => {
    const start = new Date(cohort.start_date);
    const now = new Date();
    if (Number.isNaN(start.getTime()) || now < start) return 0;
    return Math.floor((now.getTime() - start.getTime()) / (7 * MS_IN_DAY)) + 1;
  }, [cohort.start_date]);

  const loading = submitPhase !== "idle";
  const loadingLabel: Record<Exclude<SubmitPhase, "idle">, string> = {
    refreshing: "Refreshing…",
    previewing: "Checking impact…",
    applying: "Applying date shift…",
    updating: "Saving…",
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitInFlightRef.current) return;

    if (
      values.status === CohortStatus.ACTIVE &&
      values.allow_mid_entry &&
      values.mid_entry_cutoff_week < 1
    ) {
      setError("Mid-entry cutoff week must be at least 1.");
      return;
    }

    submitInFlightRef.current = true;
    setSubmitPhase("refreshing");
    setError(null);

    try {
      const shouldUseTimelineShift = shiftLinkedTimeline && datesChanged;

      if (shouldUseTimelineShift && !hasEqualShiftDelta) {
        throw new Error(
          "Linked timeline shift requires the start and end dates to move by the same number of days.",
        );
      }

      if (shouldUseTimelineShift) {
        const latest = await AcademyApi.getCohort(cohort.id);
        const latestTimezone = latest.timezone || cohortTimezone;
        const latestStart = dateOnlyForTimezone(latest.start_date, latestTimezone);
        const latestEnd = dateOnlyForTimezone(latest.end_date, latestTimezone);

        if (latestStart !== originalStartDate || latestEnd !== originalEndDate) {
          throw new Error(
            "The cohort dates changed while this page was open. Reload before applying another date change.",
          );
        }

        const newStartIso = shiftIsoByDays(latest.start_date, startShiftDays);
        const newEndIso = shiftIsoByDays(latest.end_date, startShiftDays);

        setSubmitPhase("previewing");
        const preview = await AcademyApi.previewCohortTimelineShift(cohort.id, {
          new_start_date: newStartIso,
          new_end_date: newEndIso,
          expected_updated_at: latest.updated_at,
          reason: shiftReason.trim() || undefined,
          shift_sessions: true,
          shift_installments: true,
          reset_start_reminders: true,
          notify_members: true,
          set_status_to_open_if_future: true,
        });

        const proceed = window.confirm(
          [
            "Timeline shift impact:",
            `• Sessions to shift: ${preview.sessions_shiftable}`,
            `• Sessions skipped: ${preview.sessions_blocked}`,
            `• Pending installments to rebase: ${preview.pending_installments}`,
            `• Reminder resets: ${preview.reminder_resets_possible}`,
            !isWeekAlignedShift ? "• Warning: this is not a whole-week shift." : "",
            "",
            "Proceed?",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        if (!proceed) return;

        setSubmitPhase("applying");
        try {
          await AcademyApi.applyCohortTimelineShift(cohort.id, {
            new_start_date: newStartIso,
            new_end_date: newEndIso,
            expected_updated_at: latest.updated_at,
            idempotency_key:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : undefined,
            reason: shiftReason.trim() || undefined,
            shift_sessions: true,
            shift_installments: true,
            reset_start_reminders: true,
            notify_members: true,
            set_status_to_open_if_future: true,
          });
        } catch (applyError) {
          const detail = applyError instanceof Error ? applyError.message : "";
          if (!detail.includes("Cohort was updated by another change")) throw applyError;
          const refreshed = await AcademyApi.getCohort(cohort.id);
          if (
            !sameInstant(refreshed.start_date, newStartIso) ||
            !sameInstant(refreshed.end_date, newEndIso)
          ) {
            throw applyError;
          }
        }
      }

      setSubmitPhase("updating");
      const payload: Partial<Cohort> = {
        name: values.name,
        capacity: values.capacity,
        type: values.type,
        status: values.status,
        timezone: values.timezone,
        location_type: values.location_type,
        pool_id: values.pool_id,
        location_name: values.location_name,
        location_address: values.location_address,
        allow_mid_entry: values.allow_mid_entry,
        mid_entry_cutoff_week: values.mid_entry_cutoff_week,
        require_approval: values.require_approval,
        admin_dropout_approval: values.admin_dropout_approval,
        price_override: values.price_override,
        membership_policy_override: values.membership_policy_override,
        post_graduation_club_bridge_months: values.post_graduation_club_bridge_months,
        installment_plan_enabled: values.installment_plan_enabled,
        installment_count: values.installment_plan_enabled ? values.installment_count : null,
        installment_deposit_amount: values.installment_plan_enabled
          ? values.installment_deposit_amount
          : null,
        notes_internal: values.notes_internal,
        ...(!(shiftLinkedTimeline && datesChanged)
          ? { start_date: values.start_date, end_date: values.end_date }
          : {}),
      };

      await AcademyApi.updateCohort(cohort.id, payload);
      toast.success("Cohort updated successfully");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update cohort.");
    } finally {
      submitInFlightRef.current = false;
      setSubmitPhase("idle");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <BasicsSection
        values={values}
        onChange={setValues}
        originalStartDate={originalStartDate}
        originalEndDate={originalEndDate}
        datesChanged={datesChanged}
        shiftLinkedTimeline={shiftLinkedTimeline}
        onShiftLinkedTimelineChange={setShiftLinkedTimeline}
        shiftReason={shiftReason}
        onShiftReasonChange={setShiftReason}
      />

      <EnrollmentRulesSection values={values} onChange={setValues} currentWeek={currentWeek} />
      <LocationSection values={values} onChange={setValues} />
      <CommercialSection values={values} onChange={setValues} />

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {submitPhase === "idle" ? "Save cohort" : loadingLabel[submitPhase]}
        </Button>
      </div>
    </form>
  );
}
