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
  cohort_id?: string | null;
  event_id?: string | null;
  pod_id?: string | null;
  timezone?: string;
}

export interface RideShareConfigEntry {
  ride_area_id: string;
  cost: number;
  capacity: number;
}

/**
 * Ride-share config row as persisted on a session
 * (`/transport/sessions/{id}/ride-configs`). Mirrors the server shape
 * narrowly — only the fields the session-form modals read/write.
 */
export interface SessionRideConfig {
  ride_area_id: string;
  cost: number;
  capacity: number;
  /** ISO-8601 timestamp (sent serialized; received as ISO from API). */
  departure_time: string | null;
}

/**
 * Body shape submitted to the create-session endpoint by SessionFormModal.
 * Mirrors what the form actually sends (the keys it spreads from form
 * state). Optional fields default to `null` server-side.
 */
export interface SessionPayload {
  title: string;
  session_type: SessionType;
  cohort_id: string | null;
  event_id: string | null;
  pool_id: string | null;
  location: string | null;
  location_name: string | null;
  starts_at: string;
  ends_at: string;
  pool_fee: number;
  capacity: number;
  description?: string;
  pod_id: string | null;
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
  ride_share_config?: RideShareConfigEntry[] | null;
}

export interface RideArea {
  id: string;
  name: string;
  pickup_locations: any[];
}
