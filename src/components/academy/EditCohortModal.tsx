"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  AcademyApi,
  CohortStatus,
  LocationType,
  type Cohort,
} from "@/lib/academy";
import { useEffect, useRef, useState } from "react";

type EditCohortModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cohort: Cohort) => void;
  cohort: Cohort;
};

type SubmitPhase =
  | "idle"
  | "refreshing"
  | "previewing"
  | "applying"
  | "updating";

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

const parseDateOnlyUtc = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};

const formatDateOnlyUtc = (date: Date) => date.toISOString().split("T")[0];

const dateOnlyForTimezone = (iso: string, timezone: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(iso));
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fall back to the UTC date component if timezone parsing fails.
  }
  return iso.split("T")[0];
};

const dateShiftDays = (originalDateOnly: string, newDateOnly: string) =>
  Math.round(
    (parseDateOnlyUtc(newDateOnly).getTime() -
      parseDateOnlyUtc(originalDateOnly).getTime()) /
      MILLISECONDS_IN_DAY,
  );

const shiftDateByDays = (dateOnly: string, days: number) => {
  const date = parseDateOnlyUtc(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnlyUtc(date);
};

const shiftIsoByDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * MILLISECONDS_IN_DAY).toISOString();

const extractApiErrorDetail = (err: unknown) => {
  if (!(err instanceof Error)) {
    return null;
  }
  return err.message || null;
};

const sameInstant = (leftIso: string, rightIso: string) =>
  new Date(leftIso).getTime() === new Date(rightIso).getTime();

export function EditCohortModal({
  isOpen,
  onClose,
  onSuccess,
  cohort,
}: EditCohortModalProps) {
  const submitInFlightRef = useRef(false);
  const cohortTimezone = cohort.timezone || "Africa/Lagos";
  const [loading, setLoading] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [shiftLinkedTimeline, setShiftLinkedTimeline] = useState(true);
  const [shiftReason, setShiftReason] = useState("");
  const [formData, setFormData] = useState({
    name: cohort.name,
    start_date: dateOnlyForTimezone(cohort.start_date, cohortTimezone),
    end_date: dateOnlyForTimezone(cohort.end_date, cohortTimezone),
    capacity: cohort.capacity,
    status: cohort.status,
    // New fields
    timezone: cohort.timezone || "Africa/Lagos",
    location_type: cohort.location_type || LocationType.POOL,
    location_name: cohort.location_name || "",
    location_address: cohort.location_address || "",
    notes_internal: cohort.notes_internal || "",
    allow_mid_entry: cohort.allow_mid_entry || false,
    admin_dropout_approval: cohort.admin_dropout_approval || false,
  });

  // Update form data when cohort changes
  useEffect(() => {
    setFormData({
      name: cohort.name,
      start_date: dateOnlyForTimezone(cohort.start_date, cohortTimezone),
      end_date: dateOnlyForTimezone(cohort.end_date, cohortTimezone),
      capacity: cohort.capacity,
      status: cohort.status,
      timezone: cohort.timezone || "Africa/Lagos",
      location_type: cohort.location_type || LocationType.POOL,
      location_name: cohort.location_name || "",
      location_address: cohort.location_address || "",
      notes_internal: cohort.notes_internal || "",
      allow_mid_entry: cohort.allow_mid_entry || false,
      admin_dropout_approval: cohort.admin_dropout_approval || false,
    });
    setShiftLinkedTimeline(true);
    setShiftReason("");
  }, [cohort, cohortTimezone]);

  const originalStartDate = dateOnlyForTimezone(cohort.start_date, cohortTimezone);
  const originalEndDate = dateOnlyForTimezone(cohort.end_date, cohortTimezone);
  const datesChanged =
    formData.start_date !== originalStartDate ||
    formData.end_date !== originalEndDate;
  const startShiftDays = dateShiftDays(originalStartDate, formData.start_date);
  const endShiftDays = dateShiftDays(originalEndDate, formData.end_date);
  const hasEqualShiftDelta = startShiftDays === endShiftDays;
  const isWeekAlignedShift = startShiftDays % 7 === 0;
  const loadingLabelByPhase: Record<Exclude<SubmitPhase, "idle">, string> = {
    refreshing: "Refreshing...",
    previewing: "Checking impact...",
    applying: "Applying shift...",
    updating: "Saving...",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    setLoading(true);
    setSubmitPhase("refreshing");
    setError(null);

    try {
      const shouldUseTimelineShift = shiftLinkedTimeline && datesChanged;
      if (shouldUseTimelineShift && !hasEqualShiftDelta) {
        setError(
          "Timeline shift requires start and end dates to move by the same number of days. Use linked mode or adjust both dates.",
        );
        return;
      }

      let latestCohort: Cohort | null = null;
      if (shouldUseTimelineShift) {
        latestCohort = await AcademyApi.getCohort(cohort.id);
        const latestTimezone = latestCohort.timezone || cohortTimezone;
        const latestStartDate = dateOnlyForTimezone(
          latestCohort.start_date,
          latestTimezone,
        );
        const latestEndDate = dateOnlyForTimezone(
          latestCohort.end_date,
          latestTimezone,
        );
        if (
          latestStartDate !== originalStartDate ||
          latestEndDate !== originalEndDate
        ) {
          setError(
            "Cohort dates changed while this form was open. Please close this dialog, reopen it, and apply the shift again.",
          );
          return;
        }
      }

      if (shouldUseTimelineShift) {
        if (!latestCohort) {
          throw new Error("Failed to refresh cohort before timeline shift.");
        }
        const newStartIso = shiftIsoByDays(
          latestCohort.start_date,
          startShiftDays,
        );
        const newEndIso = shiftIsoByDays(latestCohort.end_date, startShiftDays);

        setSubmitPhase("previewing");
        const preview = await AcademyApi.previewCohortTimelineShift(cohort.id, {
          new_start_date: newStartIso,
          new_end_date: newEndIso,
          expected_updated_at: latestCohort.updated_at,
          reason: shiftReason.trim() || undefined,
          shift_sessions: true,
          shift_installments: true,
          reset_start_reminders: true,
          notify_members: true,
          set_status_to_open_if_future: true,
        });

        const proceed = confirm(
          `Timeline shift impact:\n` +
            `- Sessions to shift: ${preview.sessions_shiftable}\n` +
            `- Sessions skipped: ${preview.sessions_blocked}\n` +
            `- Pending installments to rebase: ${preview.pending_installments}\n` +
            `- Reminder resets: ${preview.reminder_resets_possible}\n` +
            `${!isWeekAlignedShift ? "- Warning: shift is not full weeks; session weekdays will move.\n" : ""}\n` +
            `Proceed with this shift?`,
        );
        if (!proceed) {
          return;
        }

        setSubmitPhase("applying");
        try {
          await AcademyApi.applyCohortTimelineShift(cohort.id, {
            new_start_date: newStartIso,
            new_end_date: newEndIso,
            expected_updated_at: latestCohort.updated_at,
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
          const detail = extractApiErrorDetail(applyError) || "";
          const isConcurrencyConflict = detail.includes(
            "Cohort was updated by another change",
          );
          if (!isConcurrencyConflict) {
            throw applyError;
          }
          const refreshedAfterConflict = await AcademyApi.getCohort(cohort.id);
          const shiftAlreadyApplied =
            sameInstant(refreshedAfterConflict.start_date, newStartIso) &&
            sameInstant(refreshedAfterConflict.end_date, newEndIso);
          if (!shiftAlreadyApplied) {
            throw applyError;
          }
        }
      }

      setSubmitPhase("updating");
      const updatePayload = shouldUseTimelineShift
        ? {
            name: formData.name,
            capacity: formData.capacity,
            status: formData.status,
            timezone: formData.timezone,
            location_type: formData.location_type,
            location_name: formData.location_name,
            location_address: formData.location_address,
            notes_internal: formData.notes_internal,
            allow_mid_entry: formData.allow_mid_entry,
            admin_dropout_approval: formData.admin_dropout_approval,
          }
        : formData;

      const updatedCohort = await AcademyApi.updateCohort(
        cohort.id,
        updatePayload,
      );
      const cohortForUi = shouldUseTimelineShift
        ? await AcademyApi.getCohort(cohort.id)
        : updatedCohort;
      onSuccess(cohortForUi);
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        extractApiErrorDetail(err) || "Failed to update cohort. Please try again.",
      );
    } finally {
      submitInFlightRef.current = false;
      setSubmitPhase("idle");
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Cohort">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
      >
        {error && <div className="text-sm text-red-600">{error}</div>}

        <Input
          label="Cohort Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => {
              const startDate = e.target.value;
              if (shiftLinkedTimeline) {
                const days = dateShiftDays(originalStartDate, startDate);
                setFormData({
                  ...formData,
                  start_date: startDate,
                  end_date: shiftDateByDays(originalEndDate, days),
                });
                return;
              }
              setFormData({ ...formData, start_date: startDate });
            }}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) => {
              const endDate = e.target.value;
              if (shiftLinkedTimeline) {
                const days = dateShiftDays(originalEndDate, endDate);
                setFormData({
                  ...formData,
                  start_date: shiftDateByDays(originalStartDate, days),
                  end_date: endDate,
                });
                return;
              }
              setFormData({ ...formData, end_date: endDate });
            }}
            required
          />
        </div>

        {datesChanged && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="shift_linked_timeline"
                type="checkbox"
                checked={shiftLinkedTimeline}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setShiftLinkedTimeline(checked);
                  if (checked) {
                    const days = dateShiftDays(
                      originalStartDate,
                      formData.start_date,
                    );
                    setFormData({
                      ...formData,
                      end_date: shiftDateByDays(originalEndDate, days),
                    });
                  }
                }}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label
                htmlFor="shift_linked_timeline"
                className="text-sm font-medium text-amber-900"
              >
                Shift linked sessions, installments, reminders, and notify members
              </label>
            </div>
            {shiftLinkedTimeline && (
              <>
                <Input
                  label="Reason for date shift (optional)"
                  value={shiftReason}
                  onChange={(e) => setShiftReason(e.target.value)}
                  placeholder="e.g., Pool maintenance delayed kickoff"
                />
                {!hasEqualShiftDelta && (
                  <div className="text-xs text-amber-900">
                    Start and end shifts are currently different. Linked timeline
                    requires the same shift delta for both dates.
                  </div>
                )}
                {hasEqualShiftDelta && !isWeekAlignedShift && (
                  <div className="text-xs text-amber-900">
                    This shift is not a full number of weeks, so session weekdays
                    (for example Wednesday/Saturday) will move.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={formData.capacity}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: parseInt(e.target.value) || 0,
              })
            }
            required
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as CohortStatus,
              })
            }
          >
            {Object.values(CohortStatus).map((status) => (
              <option key={status} value={status}>
                {status.toUpperCase()}
              </option>
            ))}
          </Select>
        </div>

        {/* Location Section */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Location</h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Select
              label="Location Type"
              value={formData.location_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location_type: e.target.value as LocationType,
                })
              }
            >
              <option value={LocationType.POOL}>Pool</option>
              <option value={LocationType.OPEN_WATER}>Open Water</option>
              <option value={LocationType.REMOTE}>Remote/Online</option>
            </Select>

            <Select
              label="Timezone"
              value={formData.timezone}
              onChange={(e) =>
                setFormData({ ...formData, timezone: e.target.value })
              }
            >
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </Select>
          </div>

          <Input
            label="Location Name"
            value={formData.location_name}
            onChange={(e) =>
              setFormData({ ...formData, location_name: e.target.value })
            }
            placeholder="e.g., SunFit Pool, Ikoyi"
          />

          <Input
            label="Location Address"
            value={formData.location_address}
            onChange={(e) =>
              setFormData({ ...formData, location_address: e.target.value })
            }
            placeholder="Full address"
            className="mt-4"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allow_mid_entry"
            checked={formData.allow_mid_entry}
            onChange={(e) =>
              setFormData({ ...formData, allow_mid_entry: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label htmlFor="allow_mid_entry" className="text-sm text-slate-700">
            Allow mid-cohort entry
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="admin_dropout_approval"
            checked={formData.admin_dropout_approval}
            onChange={(e) =>
              setFormData({
                ...formData,
                admin_dropout_approval: e.target.checked,
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label
            htmlFor="admin_dropout_approval"
            className="text-sm text-slate-700"
          >
            Require admin approval for dropouts
          </label>
        </div>

        <Textarea
          label="Internal Notes (staff only)"
          value={formData.notes_internal}
          onChange={(e) =>
            setFormData({ ...formData, notes_internal: e.target.value })
          }
          placeholder="Notes visible only to staff"
        />

        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {loading && submitPhase !== "idle"
              ? loadingLabelByPhase[submitPhase]
              : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
