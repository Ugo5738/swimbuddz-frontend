"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LocationType } from "@/lib/academy";
import type { CohortEditChange, CohortEditValues } from "./types";

type Props = {
  values: CohortEditValues;
  onChange: CohortEditChange;
};

export function LocationSection({ values, onChange }: Props) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Location</h2>
        <p className="text-sm text-slate-600">
          Keep the cohort tied to the correct pool and timezone.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Location type"
          value={values.location_type}
          onChange={(event) =>
            onChange({ ...values, location_type: event.target.value as LocationType })
          }
        >
          <option value={LocationType.POOL}>Pool</option>
          <option value={LocationType.OPEN_WATER}>Open water</option>
          <option value={LocationType.REMOTE}>Remote / online</option>
        </Select>
        <Select
          label="Timezone"
          value={values.timezone}
          onChange={(event) => onChange({ ...values, timezone: event.target.value })}
        >
          <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="America/New_York">America/New_York</option>
        </Select>
      </div>

      {values.location_type === LocationType.POOL ? (
        <PoolPicker
          label="Pool"
          value={values.pool_id}
          onChange={(poolId, poolName, pool) =>
            onChange({
              ...values,
              pool_id: poolId,
              location_name: poolName ?? "",
              location_address: pool?.address ?? values.location_address,
            })
          }
          hint="Uses the Pool Registry as the canonical location."
        />
      ) : (
        <Input
          label="Location name"
          value={values.location_name}
          onChange={(event) => onChange({ ...values, location_name: event.target.value })}
        />
      )}

      <Input
        label="Location address"
        value={values.location_address}
        onChange={(event) => onChange({ ...values, location_address: event.target.value })}
      />
    </Card>
  );
}
