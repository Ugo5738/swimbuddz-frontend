"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { CohortEditChange, CohortEditValues } from "./types";

type Props = {
  values: CohortEditValues;
  onChange: CohortEditChange;
};

export function CommercialSection({ values, onChange }: Props) {
  return (
    <>
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
            value={values.price_override ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                price_override: event.target.value ? Number(event.target.value) : null,
              })
            }
            hint="Leave empty to use the programme price."
          />
          <Select
            label="Annual membership policy"
            value={values.membership_policy_override ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
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
          value={values.post_graduation_club_bridge_months}
          onChange={(event) =>
            onChange({
              ...values,
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
            checked={values.installment_plan_enabled}
            onChange={(event) =>
              onChange({
                ...values,
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

        {values.installment_plan_enabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Installment count"
              type="number"
              min={2}
              max={12}
              value={values.installment_count ?? ""}
              onChange={(event) =>
                onChange({
                  ...values,
                  installment_count: event.target.value ? Number(event.target.value) : null,
                })
              }
              hint="Leave empty for the automatic duration-based split."
            />
            <Input
              label="Deposit / first installment (₦)"
              type="number"
              min={0}
              value={values.installment_deposit_amount ?? ""}
              onChange={(event) =>
                onChange({
                  ...values,
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
          value={values.notes_internal}
          onChange={(event) => onChange({ ...values, notes_internal: event.target.value })}
          placeholder="Record exceptions, negotiated terms or operational context."
        />
      </Card>
    </>
  );
}
