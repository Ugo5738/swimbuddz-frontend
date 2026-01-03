import { apiDelete, apiGet, apiPost, apiPut } from "./api";

// --- Enums ---

export enum SessionType {
  COHORT_CLASS = "cohort_class",
  ONE_ON_ONE = "one_on_one",
  GROUP_BOOKING = "group_booking",
  CLUB = "club",
  COMMUNITY = "community",
  EVENT = "event",
}

export enum SessionStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum SessionLocation {
  SUNFIT_POOL = "sunfit_pool",
  ROWE_PARK_POOL = "rowe_park_pool",
  FEDERAL_PALACE_POOL = "federal_palace_pool",
  OPEN_WATER = "open_water",
  OTHER = "other",
}

// --- Types ---

export interface Session {
  id: string;
  title: string;
  description?: string;
  notes?: string;

  session_type: SessionType;
  status: SessionStatus;

  // Location
  location?: SessionLocation;
  location_name?: string;
  location_address?: string;

  // Timing
  starts_at: string;
  ends_at: string;
  timezone?: string;

  // Capacity & Fees
  capacity: number;
  pool_fee: number;
  ride_share_fee: number;

  // Context links
  cohort_id?: string;
  event_id?: string;
  booking_id?: string;

  // Cohort-specific
  week_number?: number;
  lesson_title?: string;

  // Template
  template_id?: string;
  is_recurring_instance: boolean;

  created_at: string;
  updated_at: string;

  // Ride share data (populated from transport service by caller)
  rideShareAreas?: RideShareArea[];
}

// Legacy interfaces for ride share support
export interface PickupLocation {
  id: string;
  name: string;
  description?: string;
  is_available: boolean;
  max_capacity: number;
  current_bookings: number;
  distance_text?: string;
  duration_text?: string;
  departure_time_calculated?: string;
}

export interface RideShareArea {
  id: string;
  ride_area_name: string;
  cost: number;
  capacity: number;
  pickup_locations: PickupLocation[];
}

export interface SessionCoach {
  id: string;
  session_id: string;
  coach_id: string;
  role: string;
  created_at: string;
}

export interface SessionCreate {
  title: string;
  description?: string;
  notes?: string;
  session_type: SessionType;
  status?: SessionStatus;
  location?: SessionLocation;
  location_name?: string;
  location_address?: string;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  capacity?: number;
  pool_fee?: number;
  ride_share_fee?: number;
  cohort_id?: string;
  event_id?: string;
  week_number?: number;
  lesson_title?: string;
}

export interface SessionUpdate {
  title?: string;
  description?: string;
  notes?: string;
  status?: SessionStatus;
  location?: SessionLocation;
  location_name?: string;
  location_address?: string;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  pool_fee?: number;
  week_number?: number;
  lesson_title?: string;
}

// --- API Functions ---
export const SessionsApi = {
  // List sessions with optional filters
  listSessions: (params?: { types?: string; cohort_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.types) query.set("types", params.types);
    if (params?.cohort_id) query.set("cohort_id", params.cohort_id);
    const queryStr = query.toString() ? `?${query.toString()}` : "";
    return apiGet<Session[]>(`/api/v1/sessions${queryStr}`);
  },

  // Get sessions for a specific cohort
  getCohortSessions: (cohortId: string) =>
    apiGet<Session[]>(`/api/v1/sessions?cohort_id=${cohortId}`),

  // Get single session
  getSession: (id: string) =>
    apiGet<Session>(`/api/v1/sessions/${id}`),

  // Create session
  createSession: (data: SessionCreate) =>
    apiPost<Session>("/api/v1/sessions/", data, { auth: true }),

  // Update session
  updateSession: (id: string, data: SessionUpdate) =>
    apiPut<Session>(`/api/v1/sessions/${id}`, data, { auth: true }),

  // Delete session
  deleteSession: (id: string) =>
    apiDelete<void>(`/api/v1/sessions/${id}`, { auth: true }),

  // Get session stats
  getStats: () =>
    apiGet<{ upcoming_sessions_count: number }>("/api/v1/sessions/stats"),
};

// --- Session API exports ---

/**
 * List all sessions
 */
export const getSessions = async (): Promise<Session[]> => {
  return SessionsApi.listSessions();
};

/**
 * Get a session by ID
 */
export const getSession = async (id: string): Promise<Session> => {
  return SessionsApi.getSession(id);
};

// Ride share options interface for session sign-in
export interface RideShareOption {
  areaId: string;
  locationId: string;
}

interface SignInToSessionParams {
  sessionId: string;
  status?: string;
  notes?: string;
  ride_config_id?: string;
  pickup_location_id?: string;
}

/**
 * Sign in to a session with optional ride share booking
 */
export const signInToSession = async (
  params: SignInToSessionParams
): Promise<{ success: boolean; message?: string }> => {
  const payload: Record<string, unknown> = {
    status: params.status || "PRESENT",
  };

  if (params.notes) {
    payload.notes = params.notes;
  }

  if (params.ride_config_id) {
    payload.ride_share_option = "NEED_RIDE";
    payload.needs_ride = true;
    payload.pickup_location = params.pickup_location_id;
  }

  try {
    await apiPost(`/api/v1/sessions/${params.sessionId}/sign-in`, payload, { auth: true });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign in to session";
    throw new Error(message);
  }
};
