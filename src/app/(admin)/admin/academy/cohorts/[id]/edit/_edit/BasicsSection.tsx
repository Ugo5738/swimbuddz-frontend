"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CohortStatus, CohortType } from "@/lib/academy";
import { dateShiftDays, shiftDateByDays } from "./date-utils";
import type { CohortEditChange, CohortEditValues } from "./types";

type Props = {
  values: CohortEditValues;
  onChange: CohortEditChange;
  originalStartDate: string;
  originalEndDate: string;
  datesChanged: boolean;
  shiftLinkedTimeline: boolean;
  onShiftLinkedTimelineChange: (checked: boolean) => void;
  shiftReason: string;
  onShiftReasonChange: (reason: string) => void;
};

export function BasicsSection({
  values,
  onChange,
  originalStartDate,
  originalEndDate,
  datesChanged,
  shiftLinkedTimeline,
  onShiftLinkedTimelineChange,
  shiftReason,
  onShiftReasonChange,
}: Props) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Basics</h2>
        <p className="text-sm text-slate-600">
          Identity, dates, capacity and lifecycle state.
        </p>
      </div>

      <Input
        label="Cohort name"
        value={values.name}
        onChange={(event) => onChange({ ...values, name: event.target.value })}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Start date"
          type="date"
          value={values.start_date}
          onChange={(event) => {
            const startDate = event.target.value;
            if (shiftLinkedTimeline) {
              const days = dateShiftDays(originalStartDate, startDate);
              onChange({
                ...values,
                start_date: startDate,
                end_date: shiftDateByDays(originalEndDate, days),
              });
            } else {
              onChange({ ...values, start_date: startDate });
            }
          }}
          required
        />
        <Input
          label="End date"
          type="date"
          value={values.end_date}
          onChange={(event) => {
            const endDate = event.target.value;
            if (shiftLinkedTimeline) {
              const days = dateShiftDays(originalEndDate, endDate);
              onChange({
                ...values,
                start_date: shiftDateByDays(originalStartDate, days),
                end_date: endDate,
              });
            } else {
              onChange({ ...values, end_date: endDate });
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
              onChange={(event) => onShiftLinkedTimelineChange(event.target.checked)}
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
              onChange={(event) => onShiftReasonChange(event.target.value)}
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
          value={values.type}
          onChange={(event) => onChange({ ...values, type: event.target.value as CohortType })}
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
          value={values.capacity}
          onChange={(event) =>
            onChange({ ...values, capacity: Number(event.target.value) || 1 })
          }
          required
        />
        <Select
          label="Status"
          value={values.status}
          onChange={(event) =>
            onChange({ ...values, status: event.target.value as CohortStatus })
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
  );
}
