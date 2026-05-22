"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import type { ScheduleItem } from "../types";

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

type Props = {
  schedule: ScheduleItem[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof ScheduleItem, value: string) => void;
  onRemove: (index: number) => void;
};

export function ScheduleStep({ schedule, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Weekly Schedule</h2>
          <p className="text-sm text-slate-600">Define when sessions will occur each week</p>
        </div>
        <Button variant="outline" onClick={onAdd}>
          + Add Time Slot
        </Button>
      </div>

      {schedule.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 flex items-end gap-4">
          <Select
            label="Day"
            value={item.day}
            onChange={(e) => onUpdate(index, "day", e.target.value)}
            className="flex-1"
          >
            {daysOfWeek.map((day) => (
              <option key={day} value={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </option>
            ))}
          </Select>
          <Input
            label="Start Time"
            type="time"
            value={item.startTime}
            onChange={(e) => onUpdate(index, "startTime", e.target.value)}
          />
          <Input
            label="End Time"
            type="time"
            value={item.endTime}
            onChange={(e) => onUpdate(index, "endTime", e.target.value)}
          />
          {schedule.length > 1 && (
            <button
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700 pb-2"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          <strong>Note:</strong> Sessions will be auto-generated based on this schedule after
          you create the cohort.
        </p>
      </div>
    </div>
  );
}
