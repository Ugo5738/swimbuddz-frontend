"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CohortRideConfigEntry } from "@/lib/academy";
import { Plus, Trash2 } from "lucide-react";

import type { CohortFormData, RideArea } from "../types";

type Props = {
  formData: CohortFormData;
  rideAreas: RideArea[];
  onChange: (next: CohortFormData) => void;
};

export function SessionDefaultsField({ formData, rideAreas, onChange }: Props) {
  const updateRideConfig = (idx: number, patch: Partial<CohortRideConfigEntry>) => {
    const next = [...formData.default_ride_configs];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...formData, default_ride_configs: next });
  };

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="font-semibold text-slate-900 mb-1">Session defaults</h3>
      <p className="text-xs text-slate-500 mb-3">
        These apply to every session generated for this cohort. You can still override fees or
        ride areas on individual sessions later.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Default pool fee per session (₦)"
          type="number"
          min={0}
          value={formData.default_pool_fee ?? ""}
          onChange={(e) =>
            onChange({
              ...formData,
              default_pool_fee: e.target.value ? Number(e.target.value) : null,
            })
          }
          placeholder="e.g. 2500"
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Default ride-share configs</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...formData,
                default_ride_configs: [
                  ...formData.default_ride_configs,
                  {
                    ride_area_id: rideAreas[0]?.id ?? "",
                    cost: 5000,
                    capacity: 4,
                  },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Add ride area
          </Button>
        </div>
        {formData.default_ride_configs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No default ride areas. Leave blank if members won&rsquo;t need rides to this cohort.
          </p>
        ) : (
          formData.default_ride_configs.map((rc, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr,120px,90px,auto] gap-2 items-end rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <Select
                label="Ride area"
                value={rc.ride_area_id}
                onChange={(e) => updateRideConfig(idx, { ride_area_id: e.target.value })}
              >
                {rideAreas.length === 0 ? (
                  <option value="">(no ride areas)</option>
                ) : (
                  rideAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))
                )}
              </Select>
              <Input
                label="Cost (₦)"
                type="number"
                min={0}
                value={rc.cost}
                onChange={(e) =>
                  updateRideConfig(idx, { cost: Number(e.target.value) || 0 })
                }
              />
              <Input
                label="Capacity"
                type="number"
                min={1}
                value={rc.capacity}
                onChange={(e) =>
                  updateRideConfig(idx, { capacity: Number(e.target.value) || 1 })
                }
              />
              <button
                type="button"
                onClick={() => {
                  const next = formData.default_ride_configs.filter((_, i) => i !== idx);
                  onChange({ ...formData, default_ride_configs: next });
                }}
                className="p-2 rounded-lg hover:bg-rose-50 text-rose-500"
                aria-label="Remove ride area"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
