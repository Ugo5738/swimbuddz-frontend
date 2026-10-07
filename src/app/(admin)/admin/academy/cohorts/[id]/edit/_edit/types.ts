import type { CohortStatus, CohortType, LocationType } from "@/lib/academy";

export type CohortEditValues = {
  name: string;
  start_date: string;
  end_date: string;
  capacity: number;
  type: CohortType;
  status: CohortStatus;
  timezone: string;
  location_type: LocationType;
  pool_id: string | null;
  location_name: string;
  location_address: string;
  allow_mid_entry: boolean;
  mid_entry_cutoff_week: number;
  require_approval: boolean;
  admin_dropout_approval: boolean;
  price_override: number | null;
  membership_policy_override: "open" | "active_required" | "included" | null;
  post_graduation_club_bridge_months: number;
  installment_plan_enabled: boolean;
  installment_count: number | null;
  installment_deposit_amount: number | null;
  notes_internal: string;
};

export type CohortEditChange = (next: CohortEditValues) => void;
