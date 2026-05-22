"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import type { VolunteerProfile } from "@/lib/volunteers";
import { Clock } from "lucide-react";

export type HoursForm = {
  hours: string;
  date: string;
  notes: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  target: VolunteerProfile | null;
  hoursForm: HoursForm;
  setHoursForm: React.Dispatch<React.SetStateAction<HoursForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function LogHoursModal({
  isOpen,
  onClose,
  target,
  hoursForm,
  setHoursForm,
  onSubmit,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Volunteer Hours">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-teal-50 px-4 py-3">
          <Clock className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {target?.member_name || "Unknown"}
            </p>
            <p className="text-xs text-slate-500">
              Current total: {target?.total_hours.toFixed(1)}h across{" "}
              {target?.total_sessions_volunteered} sessions
            </p>
          </div>
        </div>

        <Input
          label="Hours"
          type="number"
          step="0.5"
          min="0.5"
          max="24"
          value={hoursForm.hours}
          onChange={(e) => setHoursForm({ ...hoursForm, hours: e.target.value })}
          placeholder="e.g. 2.5"
          required
        />

        <Input
          label="Date"
          type="date"
          value={hoursForm.date}
          onChange={(e) => setHoursForm({ ...hoursForm, date: e.target.value })}
          required
        />

        <Textarea
          label="Notes (optional)"
          value={hoursForm.notes}
          onChange={(e) => setHoursForm({ ...hoursForm, notes: e.target.value })}
          rows={2}
          placeholder="e.g. Warm-up lead for Saturday session, media editing..."
        />

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Log Hours</Button>
        </div>
      </form>
    </Modal>
  );
}
