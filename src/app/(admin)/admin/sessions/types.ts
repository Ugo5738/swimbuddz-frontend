// Types extracted from page.tsx during the file-size sweep.
// Kept local to this route since these shapes are only used by the
// admin sessions page; if another route ends up needing them, promote
// to `src/types/`.

export type SessionStatusType =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type SessionType =
  | "club"
  | "academy"
  | "community"
  | "cohort_class"
  | "event";

export type ViewMode = "calendar" | "list";
export type FilterTab = "all" | SessionStatusType;

export interface Session {
  id: string;
  title: string;
  session_type?: SessionType;
  status?: SessionStatusType;
  published_at?: string;
  pool_id?: string | null;
  location: string | null;
  location_name?: string | null;
  starts_at: string;
  ends_at: string;
  pool_fee: number;
  ride_share_fee?: number;
  capacity: number;
  description?: string;
  notes?: string;
  template_id?: string;
  is_recurring_instance?: boolean;
  cohort_id?: string;
  pod_id?: string | null;
  timezone?: string;
}

export interface Template {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  pool_id?: string | null;
  location: string | null;
  location_name?: string | null;
  session_type?: string;
  pool_fee: number;
  ride_share_fee?: number;
  capacity: number;
  auto_generate: boolean;
  is_active: boolean;
  description?: string;
  ride_share_config?: any;
}

export interface RideArea {
  id: string;
  name: string;
  pickup_locations: any[];
}
