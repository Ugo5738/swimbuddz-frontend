"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  AcademyApi,
  CohortStatus,
  CohortType,
  LocationType,
  type Cohort,
} from "@/lib/academy";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  cohort: Cohort;
  onCancel: () => void;
  onSaved: () => void;
};

type SubmitPhase = "idle" | "refreshing" | "previewing" | "applying" | "updating";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

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
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall back to the UTC date component if timezone parsing fails.
  }
  return iso.split("T")[0];
};

const dateShiftDays = (originalDateOnly: string, newDateOnly: string) =>
  Math.round(
    (parseDateOnlyUtc(newDateOnly).getTime() - parseDateOnlyUtc(originalDateOnly).getTime()) /
      MS_IN_DAY,
  );

const shiftDateByDays = (dateOnly: string, days: number) => {
  const date = parseDateOnlyUtc(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnlyUtc(date);
};

const shiftIsoByDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * MS_IN_DAY).toISOString();

const sameInstant = (leftIso: string, rightIso: string) =>
  new Date(leftIso).getTime() === new Date(rightIso).getTime();

export function CohortEditForm({ cohort, onCancel, onSaved }: Props) {
  const submitInFlightRef = useRef(false);
  const cohortTimezone = cohort.timezone || "Africa/Lagos";

  const [formData, setFormData] = useState({
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
    formData.start_date !== originalStartDate || formData.end_date !== originalEndDate;
  const startShiftDays = dateShiftDays(originalStartDate, formData.start_date);
  const endShiftDays = dateShiftDays(originalEndDate, formData.end_date);
  const hasEqualShiftDelta = startShiftDays === endShiftDays;
  const isWeekAlignedShift = startShiftDays % 7 === 0;

  const currentWeek = useMemo(() => {
    const start = new Date(cohort.start_date);
    const now = new Date();
    if (Number.isNaN(start.getTime()) || now < start) return 0;
    return Math.floor((now.getTime() - start.getTime()) / (7 * MS_IN_DAY)) + 1;
  }, [cohort.start_date]);

  const midEntryOpen =
    formData.status === CohortStatus.OPEN ||
    (formData.status === CohortStatus.ACTIVE &&
      formData.allow_mid_entry &&
      currentWeek > 0 &&
      currentWeek <= formData.mid_entry_cutoff_week);

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
      formData.status === CohortStatus.ACTIVE &&
      formData.allow_mid_entry &&
      formData.mid_entry_cutoff_week < 1
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

      let latestCohort: Cohort | null = null;

      if (shouldUseTimelineShift) {
        latestCohort = await AcademyApi.getCohort(cohort.id);
        const latestTimezone = latestCohort.timezone || cohortTimezone;
        const latestStart = dateOnlyForTimezone(latestCohort.start_date, latestTimezone);
        const latestEnd = dateOnlyForTimezone(latestCohort.end_date, latestTimezone);

        if (latestStart !== originalStartDate || latestEnd !== originalEndDate) {
          throw new Error(
            "The cohort dates changed while this page was open. Reload before applying another date change.",
          );
        }

        const newStartIso = shiftIsoByDays(latestCohort.start_date, startShiftDays);
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
          const detail = applyError instanceof Error ? applyError.message : "";
          if (!detail.includes("Cohort was updated by another change")) throw applyError;

          const refreshed = await AcademyApi.getCohort(cohort.id);
          if (!sameInstant(refreshed.start_date, newStartIso) || !sameInstant(refreshed.end_date, newEndIso)) {
            throw applyError;
          }
        }
      }

      setSubmitPhase("updating");
      const updatePayload: Partial<Cohort> = {
        name: formData.name,
        capacity: formData.capacity,
        type: formData.type,
        status: formData.status,
        timezone: formData.timezone,
        location_type: formData.location_type,
        pool_id: formData.pool_id,
        location_name: formData.location_name,
        location_address: formData.location_address,
        allow_mid_entry: formData.allow_mid_entry,
        mid_entry_cutoff_week: formData.mid_entry_cutoff_week,
        require_approval: formData.require_approval,
        admin_dropout_approval: formData.admin_dropout_approval,
        price_override: formData.price_override,
        membership_policy_override: formData.membership_policy_override,
        post_graduation_club_bridge_months: formData.post_graduation_club_bridge_months,
        installment_plan_enabled: formData.installment_plan_enabled,
        installment_count: formData.installment_plan_enabled ? formData.installment_count : null,
        installment_deposit_amount: formData.installment_plan_enabled
          ? formData.installment_deposit_amount
          : null,
        notes_internal: formData.notes_internal,
        ...(!shouldUseTimelineShift
          ? {
              start_date: formData.start_date,
              end_date: formData.end_date,
            }
          : {}),
      };

      await AcademyApi.updateCohort(cohort.id, updatePayload);
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

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Basics</h2>
          <p className="text-sm text-slate-600">
            Identity, dates, capacity and lifecycle state.
          </p>
        </div>

        <Input
          label="Cohort name"
          value={formData.name}
          onChange={(event) => setFormData({ ...formData, name: event.target.value })}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            value={formData.start_date}
            onChange={(event) => {
              const startDate = event.target.value;
              if (shiftLinkedTimeline) {
                const days = dateShiftDays(originalStartDate, startDate);
                setFormData({
                  ...formData,
                  start_date: startDate,
                  end_date: shiftDateByDays(originalEndDate, days),
                });
              } else {
                setFormData({ ...formData, start_date: startDate });
              }
            }}
            required
          />
          <Input
            label="End date"
            type="date"
            value={formData.end_date}
            onChange={(event) => {
              const endDate = event.target.value;
              if (shiftLinkedTimeline) {
                const days = dateShiftDays(originalEndDate, endDate);
                setFormData({
                  ...formData,
                  start_date: shiftDateByDays(originalStartDate, days),
                  end_date: endDate,
                });
              } else {
                setFormData({ ...formData, end_date: endDate });
              }
            }}
            required
          />
        </div>

        {datesChanged ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-start gap-2 text-sm text-amber-950">
              <input
                type="checkbox"
                checked={shiftLinkedTimeline}
                onChange={(event) => setShiftLinkedTimeline(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-300"
              />
              <span>
                <strong>Shift linked timeline.</strong> Move sessions, pending installment due
                dates and start reminders with the cohort dates, then notify members.
              </span>
            </label>
            {shiftLinkedTimeline ? (
              <Input
                label="Reason for date shift (optional)"
                value={shiftReason}
                onChange={(event) => setShiftReason(event.target.value)}
                placeholder="e.g. Pool maintenance delayed kickoff"
              />
            ) : (
              <p className="text-xs text-amber-900">
                Dates will change without moving linked sessions or installment due dates.
              </p>
            )}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Cohort type"
            value={formData.type}
            onChange={(event) =>
              setFormData({ ...formData, type: event.target.value as CohortType })
            }
          >
            <option value={CohortType.GROUP}>Group</option>
            <option value={CohortType.PRIVATE}>Private (1:1)</option>
            <option value={CohortType.SMALL_GROUP}>Small group</option>
            <option value={CohortType.CORPORATE}>Corporate</option>
          </Select>
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={formData.capacity}
            onChange={(event) =>
              setFormData({ ...formData, capacity: Number(event.target.value) || 1 })
            }
            required
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(event) =>
              setFormData({ ...formData, status: event.target.value as CohortStatus })
            }
          >
            {Object.values(CohortStatus).map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ").toUpperCase()}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Enrollment rules</h2>
          <p className="text-sm text-slate-600">
            Control whether someone can join after classes have already started.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.allow_mid_entry}
            onChange={(event) =>
              setFormData({ ...formData, allow_mid_entry: event.target.checked })
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <p className="text-sm font-medium text-slate-800">Allow mid-cohort entry</p>
            <p className="text-xs text-slate-500">
              Required for an ACTIVE cohort to appear as joinable.
            </p>
          </div>
        </label>

        {formData.allow_mid_entry ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Mid-entry cutoff week"
              type="number"
              min={1}
              value={formData.mid_entry_cutoff_week}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  mid_entry_cutoff_week: Math.max(1, Number(event.target.value) || 1),
                })
              }
              hint="Example: 4 means learners may join through Week 4."
            />
            <div
              className={`rounded-xl border p-4 text-sm ${
                midEntryOpen
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <p className="font-semibold">
                {formData.status === CohortStatus.OPEN
                  ? "Enrollment is open"
                  : midEntryOpen
                    ? "Mid-entry is currently open"
                    : "Mid-entry is currently closed"}
              </p>
              {formData.status === CohortStatus.ACTIVE ? (
                <p className="mt-1 text-xs">
                  Current cohort week: {currentWeek || "—"} · cutoff: Week{" "}
                  {formData.mid_entry_cutoff_week}
                </p>
              ) : (
                <p className="mt-1 text-xs">
                  The cutoff applies once the cohort becomes ACTIVE.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={formData.require_approval}
              onChange={(event) =>
                setFormData({ ...formData, require_approval: event.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Require admin approval
              </span>
              <span className="block text-xs text-slate-500">
                Paid enrollments remain pending until an admin approves them.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={formData.admin_dropout_approval}
              onChange={(event) =>
                setFormData({ ...formData, admin_dropout_approval: event.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Review automatic dropouts
              </span>
              <span className="block text-xs text-slate-500">
                Missed-installment dropouts require an admin decision.
              </span>
            </span>
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Location</h2>
          <p className="text-sm text-slate-600">
            Keep the cohort tied to the correct pool and timezone.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Location type"
            value={formData.location_type}
            onChange={(event) =>
              setFormData({
                ...formData,
                location_type: event.target.value as LocationType,
              })
            }
          >
            <option value={LocationType.POOL}>Pool</option>
            <option value={LocationType.OPEN_WATER}>Open water</option>
            <option value={LocationType.REMOTE}>Remote / online</option>
          </Select>
          <Select
            label="Timezone"
            value={formData.timezone}
            onChange={(event) => setFormData({ ...formData, timezone: event.target.value })}
          >
            <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="America/New_York">America/New_York</option>
          </Select>
        </div>

        {formData.location_type === LocationType.POOL ? (
          <PoolPicker
            label="Pool"
            value={formData.pool_id}
            onChange={(poolId, poolName, pool) =>
              setFormData({
                ...formData,
                pool_id: poolId,
                location_name: poolName ?? "",
                location_address: pool?.address ?? formData.location_address,
              })
            }
            hint="Uses the Pool Registry as the canonical location."
          />
        ) : (
          <Input
            label="Location name"
            value={formData.location_name}
            onChange={(event) =>
              setFormData({ ...formData, location_name: event.target.value })
            }
          />
        )}

        <Input
          label="Location address"
          value={formData.location_address}
          onChange={(event) =>
            setFormData({ ...formData, location_address: event.target.value })
          }
        />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pricing & membership</h2>
          <p className="text-sm text-slate-600">
            New enrollments snapshot these terms. Existing enrollment price snapshots remain
            unchanged.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price override (₦)"
            type="number"
            min={0}
            value={formData.price_override ?? ""}
            onChange={(event) =>
              setFormData({
                ...formData,
                price_override: event.target.value ? Number(event.target.value) : null,
              })
            }
            hint="Leave empty to use the programme price."
          />
          <Select
            label="Annual membership policy"
            value={formData.membership_policy_override ?? ""}
            onChange={(event) =>
              setFormData({
                ...formData,
                membership_policy_override:
                  (event.target.value as "open" | "active_required" | "included") || null,
              })
            }
          >
            <option value="">Use programme policy</option>
            <option value="open">Open — no annual membership required</option>
            <option value="active_required">Active annual membership required</option>
            <option value="included">Included in Academy price</option>
          </Select>
        </div>

        <Input
          label="Post-graduation Club bridge (months)"
          type="number"
          min={0}
          max={12}
          value={formData.post_graduation_club_bridge_months}
          onChange={(event) =>
            setFormData({
              ...formData,
              post_graduation_club_bridge_months: Math.max(
                0,
                Math.min(12, Number(event.target.value) || 0),
              ),
            })
          }
          hint="Grants Club eligibility after graduation. Enter 0 to disable."
        />
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Installment plan</h2>
          <p className="text-sm text-slate-600">
            Changes affect only members who choose installments after this update. Existing
            schedules are not rewritten.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.installment_plan_enabled}
            onChange={(event) =>
              setFormData({
                ...formData,
                installment_plan_enabled: event.target.checked,
                ...(!event.target.checked
                  ? { installment_count: null, installment_deposit_amount: null }
                  : {}),
              })
            }
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-800">
            Allow members to choose installment payments
          </span>
        </label>

        {formData.installment_plan_enabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Installment count"
              type="number"
              min={2}
              max={12}
              value={formData.installment_count ?? ""}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  installment_count: event.target.value ? Number(event.target.value) : null,
                })
              }
              hint="Leave empty for the automatic duration-based split."
            />
            <Input
              label="Deposit / first installment (₦)"
              type="number"
              min={0}
              value={formData.installment_deposit_amount ?? ""}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  installment_deposit_amount: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              hint="Leave empty for an even split."
            />
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Internal notes</h2>
          <p className="text-sm text-slate-600">Visible only to SwimBuddz staff.</p>
        </div>
        <Textarea
          label="Notes"
          value={formData.notes_internal}
          onChange={(event) =>
            setFormData({ ...formData, notes_internal: event.target.value })
          }
          placeholder="Record exceptions, negotiated terms or operational context."
        />
      </Card>

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && submitPhase !== "idle" ? loadingLabel[submitPhase] : "Save cohort"}
        </Button>
      </div>
    </form>
  );
}
