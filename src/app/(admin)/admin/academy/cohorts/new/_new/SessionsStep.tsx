"use client";

import { Textarea } from "@/components/ui/Textarea";

import type { ScheduleItem } from "../types";

type Props = {
  sessionCount: number;
  schedule: ScheduleItem[];
  notesInternal: string;
  onNotesChange: (value: string) => void;
};

export function SessionsStep({ sessionCount, schedule, notesInternal, onNotesChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Session Preview</h2>
      <p className="text-sm text-slate-600">
        Based on your schedule, the following sessions will be created:
      </p>

      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <div className="text-3xl font-bold text-cyan-700">{sessionCount}</div>
        <div className="text-sm text-cyan-600">Total sessions</div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-slate-900">Weekly Pattern:</h3>
        {schedule.map((item, index) => (
          <div key={index} className="text-sm text-slate-700">
            • Every <strong>{item.day}</strong> from {item.startTime} to {item.endTime}
          </div>
        ))}
      </div>

      <Textarea
        label="Internal Notes (optional)"
        value={notesInternal}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Notes visible only to admins/coaches..."
      />
    </div>
  );
}
