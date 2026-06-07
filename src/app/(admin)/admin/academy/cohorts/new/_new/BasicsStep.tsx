"use client";

import { CoachPicker } from "@/components/admin/CoachPicker";
import { PoolPicker } from "@/components/admin/PoolPicker";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CohortStatus, CohortType, LocationType, type Program } from "@/lib/academy";

import type { CohortFormData, RideArea } from "../types";
import { InstallmentPlanField } from "./InstallmentPlanField";
import { SessionDefaultsField } from "./SessionDefaultsField";

type Props = {
  selectedProgram: Program | undefined;
  formData: CohortFormData;
  rideAreas: RideArea[];
  onChange: (next: CohortFormData) => void;
};

export function BasicsStep({ selectedProgram, formData, rideAreas, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Cohort Details</h2>

      {selectedProgram && (
        <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm">
          <span className="font-medium text-cyan-900">Program:</span>{" "}
          <span className="text-cyan-700">{selectedProgram.name}</span>
          <span className="text-cyan-600 ml-2">
            ({selectedProgram.duration_weeks} weeks)
          </span>
        </div>
      )}

      <Input
        label="Cohort Name *"
        value={formData.name}
        onChange={(e) => onChange({ ...formData, name: e.target.value })}
        placeholder="Auto-generated from program and start date"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date *"
          type="date"
          value={formData.start_date}
          onChange={(e) => onChange({ ...formData, start_date: e.target.value })}
        />
        <Input
          label="End Date"
          type="date"
          value={formData.end_date}
          onChange={(e) => onChange({ ...formData, end_date: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Cohort Type"
          value={formData.type}
          onChange={(e) => {
            const newType = e.target.value as CohortType;
            onChange({
              ...formData,
              type: newType,
              // A private (1:1) cohort is a single learner.
              capacity: newType === CohortType.PRIVATE ? 1 : formData.capacity,
            });
          }}
        >
          <option value={CohortType.GROUP}>Group (8–12)</option>
          <option value={CohortType.PRIVATE}>Private (1:1)</option>
          <option value={CohortType.SMALL_GROUP}>Small group (2–6)</option>
          <option value={CohortType.CORPORATE}>Corporate</option>
        </Select>
        <Input
          label="Capacity"
          type="number"
          min={1}
          value={formData.capacity}
          onChange={(e) =>
            onChange({
              ...formData,
              capacity: parseInt(e.target.value) || 10,
            })
          }
        />
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) =>
            onChange({
              ...formData,
              status: e.target.value as CohortStatus,
            })
          }
        >
          <option value={CohortStatus.OPEN}>Open for Enrollment</option>
          <option value={CohortStatus.ACTIVE}>Active (In Progress)</option>
        </Select>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold text-slate-900 mb-3">Coach Assignment</h3>
        <div className="space-y-4">
          <CoachPicker
            value={formData.lead_coach_id}
            onChange={(memberId) => onChange({ ...formData, lead_coach_id: memberId })}
            label="Lead Coach"
            hint="Primary coach responsible for this cohort"
          />
          <CoachPicker
            value={formData.assistant_coach_id}
            onChange={(memberId) => onChange({ ...formData, assistant_coach_id: memberId })}
            label="Assistant Coach (optional)"
            hint="Supporting coach for the cohort"
          />
          {formData.lead_coach_id &&
            formData.assistant_coach_id &&
            formData.lead_coach_id === formData.assistant_coach_id && (
              <p className="text-sm text-amber-600">
                ⚠ Lead and assistant coach cannot be the same person
              </p>
            )}
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold text-slate-900 mb-3">Location</h3>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Location Type"
            value={formData.location_type}
            onChange={(e) =>
              onChange({
                ...formData,
                location_type: e.target.value as LocationType,
              })
            }
          >
            <option value={LocationType.POOL}>Pool</option>
            <option value={LocationType.OPEN_WATER}>Open Water</option>
            <option value={LocationType.REMOTE}>Remote/Online</option>
          </Select>
          <div>
            {formData.location_type === LocationType.POOL ? (
              <PoolPicker
                label="Pool"
                value={formData.pool_id}
                onChange={(poolId, poolName) =>
                  onChange({
                    ...formData,
                    pool_id: poolId,
                    // Mirror into location_name so the cohort card and any legacy
                    // reader still show the pool name.
                    location_name: poolName ?? "",
                  })
                }
                hint="Manage pools at Admin → Pool Registry. Every session generated for this cohort will link to this pool."
              />
            ) : (
              <Input
                label="Location Name"
                value={formData.location_name}
                onChange={(e) => onChange({ ...formData, location_name: e.target.value })}
                placeholder="e.g., Lekki Open Water Swim Area"
              />
            )}
          </div>
        </div>
        <Input
          label="Address"
          value={formData.location_address}
          onChange={(e) => onChange({ ...formData, location_address: e.target.value })}
          placeholder="Full address (only needed if pool isn't in the registry yet)"
          className="mt-4"
        />
      </div>

      <SessionDefaultsField formData={formData} rideAreas={rideAreas} onChange={onChange} />

      <label className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          checked={formData.allow_mid_entry}
          onChange={(e) =>
            onChange({
              ...formData,
              allow_mid_entry: e.target.checked,
            })
          }
          className="rounded border-slate-300"
        />
        <span className="text-sm text-slate-700">Allow mid-cohort enrollment</span>
      </label>

      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={formData.require_approval}
          onChange={(e) =>
            onChange({
              ...formData,
              require_approval: e.target.checked,
            })
          }
          className="rounded border-slate-300"
        />
        <div>
          <span className="text-sm text-slate-700">Require admin approval</span>
          <p className="text-xs text-slate-500">
            If enabled, enrollments stay pending even after payment until manually approved
          </p>
        </div>
      </label>

      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold text-slate-900 mb-3">Pricing</h3>
        <Input
          label="Price Override (₦)"
          type="number"
          value={formData.price_override ?? ""}
          onChange={(e) =>
            onChange({
              ...formData,
              price_override: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          placeholder={`Leave empty to use program price${selectedProgram?.price_amount ? ` (₦${selectedProgram.price_amount.toLocaleString()})` : ""}`}
        />
        <p className="text-xs text-slate-500 mt-1">
          Override the program&apos;s default price for this specific cohort
        </p>
      </div>

      <InstallmentPlanField
        formData={formData}
        selectedProgram={selectedProgram}
        onChange={onChange}
      />
    </div>
  );
}
