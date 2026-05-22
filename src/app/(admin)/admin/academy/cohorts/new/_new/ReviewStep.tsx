import type { Program } from "@/lib/academy";

import type { CohortFormData, ScheduleItem } from "../types";

type Props = {
  selectedProgram: Program | undefined;
  formData: CohortFormData;
  schedule: ScheduleItem[];
  sessionCount: number;
};

export function ReviewStep({ selectedProgram, formData, schedule, sessionCount }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Review & Create</h2>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Program</h3>
          <p className="text-slate-700">{selectedProgram?.name || "—"}</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Cohort Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-slate-500">Name:</span> {formData.name || "—"}
            </div>
            <div>
              <span className="text-slate-500">Capacity:</span> {formData.capacity}
            </div>
            <div>
              <span className="text-slate-500">Start:</span> {formData.start_date || "—"}
            </div>
            <div>
              <span className="text-slate-500">End:</span> {formData.end_date || "—"}
            </div>
            <div>
              <span className="text-slate-500">Location:</span>{" "}
              {formData.location_name || "Not set"}
            </div>
            <div>
              <span className="text-slate-500">Status:</span> {formData.status}
            </div>
            <div>
              <span className="text-slate-500">Dropout flow:</span>{" "}
              {formData.admin_dropout_approval
                ? "Admin approval required"
                : "Automatic after threshold"}
            </div>
            <div>
              <span className="text-slate-500">Lead Coach:</span>{" "}
              {formData.lead_coach_id ? "Assigned" : "Not assigned"}
            </div>
            <div>
              <span className="text-slate-500">Assistant Coach:</span>{" "}
              {formData.assistant_coach_id ? "Assigned" : "None"}
            </div>
            <div>
              <span className="text-slate-500">Installments:</span>{" "}
              {formData.installment_plan_enabled ? (
                <span className="text-green-700">
                  Enabled
                  {formData.installment_count
                    ? ` · ${formData.installment_count} payments`
                    : " · auto-count"}
                  {formData.installment_deposit_amount
                    ? ` · ₦${formData.installment_deposit_amount.toLocaleString()} deposit`
                    : " · even split"}
                </span>
              ) : (
                <span className="text-slate-400">Disabled (full payment only)</span>
              )}
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-2">
            Schedule ({sessionCount} sessions)
          </h3>
          <div className="text-sm space-y-1">
            {schedule.map((item, index) => (
              <div key={index} className="text-slate-700">
                {item.day.charAt(0).toUpperCase() + item.day.slice(1)}: {item.startTime} –{" "}
                {item.endTime}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
