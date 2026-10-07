"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CohortStatus } from "@/lib/academy";
import type { CohortEditChange, CohortEditValues } from "./types";

type Props = {
  values: CohortEditValues;
  onChange: CohortEditChange;
  currentWeek: number;
};

export function EnrollmentRulesSection({ values, onChange, currentWeek }: Props) {
  const midEntryOpen =
    values.status === CohortStatus.OPEN ||
    (values.status === CohortStatus.ACTIVE &&
      values.allow_mid_entry &&
      currentWeek > 0 &&
      currentWeek <= values.mid_entry_cutoff_week);

  return (
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
          checked={values.allow_mid_entry}
          onChange={(event) => onChange({ ...values, allow_mid_entry: event.target.checked })}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        <div>
          <p className="text-sm font-medium text-slate-800">Allow mid-cohort entry</p>
          <p className="text-xs text-slate-500">
            Required for an ACTIVE cohort to appear as joinable.
          </p>
        </div>
      </label>

      {values.allow_mid_entry ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Mid-entry cutoff week"
            type="number"
            min={1}
            value={values.mid_entry_cutoff_week}
            onChange={(event) =>
              onChange({
                ...values,
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
              {values.status === CohortStatus.OPEN
                ? "Enrollment is open"
                : midEntryOpen
                  ? "Mid-entry is currently open"
                  : "Mid-entry is currently closed"}
            </p>
            {values.status === CohortStatus.ACTIVE ? (
              <p className="mt-1 text-xs">
                Current cohort week: {currentWeek || "—"} · cutoff: Week{" "}
                {values.mid_entry_cutoff_week}
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
            checked={values.require_approval}
            onChange={(event) => onChange({ ...values, require_approval: event.target.checked })}
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
            checked={values.admin_dropout_approval}
            onChange={(event) =>
              onChange({ ...values, admin_dropout_approval: event.target.checked })
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
  );
}
