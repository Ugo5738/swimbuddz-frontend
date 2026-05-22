"use client";

import { Input } from "@/components/ui/Input";
import type { Program } from "@/lib/academy";

import type { CohortFormData } from "../types";

type Props = {
  formData: CohortFormData;
  selectedProgram: Program | undefined;
  onChange: (next: CohortFormData) => void;
};

export function InstallmentPlanField({ formData, selectedProgram, onChange }: Props) {
  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="font-semibold text-slate-900 mb-1">Installment Plan</h3>
      <p className="text-xs text-slate-500 mb-3">
        Allow members to spread payments over the cohort duration. Count and amounts are
        auto-computed unless you override them.
      </p>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.installment_plan_enabled}
          onChange={(e) =>
            onChange({
              ...formData,
              installment_plan_enabled: e.target.checked,
              // Clear overrides when disabling
              ...(!e.target.checked && {
                installment_count: null,
                installment_deposit_amount: null,
              }),
            })
          }
          className="rounded border-slate-300"
        />
        <div>
          <span className="text-sm text-slate-700">
            Enable installment payments for this cohort
          </span>
          {selectedProgram && (
            <p className="text-xs text-slate-500">
              Auto-plan: {Math.max(1, Math.floor(selectedProgram.duration_weeks / 4))}{" "}
              installment
              {Math.max(1, Math.floor(selectedProgram.duration_weeks / 4)) !== 1 ? "s" : ""}{" "}
              every 4 weeks
            </p>
          )}
        </div>
      </label>

      {formData.installment_plan_enabled && (
        <div className="mt-4 space-y-4 pl-6 border-l-2 border-cyan-200">
          <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-xs text-cyan-800">
            <strong>Auto-computed defaults:</strong> count = duration ÷ 4 weeks (max 3 if fee &gt;
            ₦150,000), amounts split evenly with any remainder added to the first installment, due
            dates every 4 weeks from cohort start.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Installment Count (override)"
                type="number"
                min={2}
                max={12}
                value={formData.installment_count ?? ""}
                onChange={(e) =>
                  onChange({
                    ...formData,
                    installment_count: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder={
                  selectedProgram
                    ? `Auto: ${Math.max(1, Math.floor(selectedProgram.duration_weeks / 4))}`
                    : "Auto-computed"
                }
              />
              <p className="text-xs text-slate-500 mt-1">
                Leave empty to use auto-computed count
              </p>
            </div>

            <div>
              <Input
                label="Deposit / First Installment (₦)"
                type="number"
                min={0}
                value={formData.installment_deposit_amount ?? ""}
                onChange={(e) =>
                  onChange({
                    ...formData,
                    installment_deposit_amount: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Leave empty for even split"
              />
              <p className="text-xs text-slate-500 mt-1">
                First payment amount; rest split evenly
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.admin_dropout_approval}
              onChange={(e) =>
                onChange({
                  ...formData,
                  admin_dropout_approval: e.target.checked,
                })
              }
              className="rounded border-slate-300"
            />
            <div>
              <span className="text-sm text-slate-700">
                Require admin approval for dropouts
              </span>
              <p className="text-xs text-slate-500">
                If enabled, students with repeated missed installments move to dropout pending and
                must be manually confirmed by an admin
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
