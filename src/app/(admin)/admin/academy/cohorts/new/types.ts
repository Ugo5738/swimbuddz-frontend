// Types extracted from page.tsx during the file-size sweep.

import type {
  CohortRideConfigEntry,
  CohortStatus,
  CohortType,
  LocationType,
} from "@/lib/academy";

export interface RideArea {
  id: string;
  name: string;
}

// Day/time schedule item
export interface ScheduleItem {
  day: string;
  startTime: string;
  endTime: string;
}

// Shape of the form state held by the wizard page.
export type CohortFormData = {
  name: string;
  start_date: string;
  end_date: string;
  capacity: number;
  type: CohortType;
  status: CohortStatus;
  allow_mid_entry: boolean;
  require_approval: boolean;
  admin_dropout_approval: boolean;
  lead_coach_id: string | null;
  assistant_coach_id: string | null;
  timezone: string;
  location_type: LocationType;
  pool_id: string | null;
  location_name: string;
  location_address: string;
  notes_internal: string;
  price_override: number | null;
  default_pool_fee: number | null;
  default_ride_configs: CohortRideConfigEntry[];
  installment_plan_enabled: boolean;
  installment_count: number | null;
  installment_deposit_amount: number | null;
};
