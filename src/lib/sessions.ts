import { apiGet, apiPost } from "./api";
import type { components } from "./api-types";

// Use generated types from backend
type SessionResponse = components["schemas"]["SessionResponse"];

export enum RideShareOption {
  NONE = "none",
  LEAD = "lead",
  JOIN = "join"
}

export interface PickupLocation {
  id: string;
  name: string;
  description?: string;
  is_available: boolean;
  current_bookings: number;
  max_capacity: number;
  distance_text?: string;
  duration_text?: string;
  departure_time_calculated?: string;
  arrival_time_calculated?: string;
}

export interface RideShareArea {
  id: string;
  ride_area_id: string;
  ride_area_name: string;
  pickup_locations: PickupLocation[];
  cost: number;
  capacity: number;
  departure_time?: string;
}

type SignInOptions = {
  sessionId: string;
  status: string; // PRESENT, LATE, EARLY
  notes?: string;
  ride_share_option?: RideShareOption;
  needs_ride?: boolean;
  can_offer_ride?: boolean;
  pickup_location?: string;
  ride_config_id?: string;
  pickup_location_id?: string;
};

export async function signInToSession(options: SignInOptions) {
  // 1. Sign in to session (Attendance)
  const attendance = await apiPost(
    `/api/v1/attendance/sessions/${options.sessionId}/sign-in`,
    {
      status: options.status,
      role: "SWIMMER",
      notes: options.notes,
      ride_share_option: options.ride_share_option || RideShareOption.NONE,
      needs_ride: options.needs_ride || false,
      can_offer_ride: options.can_offer_ride || false,
      pickup_location: options.pickup_location,
    },
    { auth: true }
  );

  // 2. Book Ride if selected
  if (options.ride_config_id && options.pickup_location_id) {
    try {
      const me = await apiGet<any>("/api/v1/members/me", { auth: true });

      await apiPost(
        `/api/v1/transport/sessions/${options.sessionId}/bookings?member_id=${me.id}`,
        {
          session_ride_config_id: options.ride_config_id,
          pickup_location_id: options.pickup_location_id,
        },
        { auth: true }
      );
    } catch (e) {
      console.error("Failed to book ride", e);
    }
  }

  return attendance;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: string;
  poolFee: number;
  rideShareFee?: number;
  rideShareAreas?: RideShareArea[];
}

// Re-export the backend session type for direct API access if needed
export type BackendSession = SessionResponse;

async function getMembership(): Promise<"community" | "club" | "academy"> {
  try {
    const profile = await apiGet<any>("/api/v1/members/me", { auth: true });
    if (profile) {
      const tier =
        profile.membership_tier ||
        (profile.membership_tiers && profile.membership_tiers[0]) ||
        "community";
      return (tier as string).toLowerCase() as "community" | "club" | "academy";
    }
  } catch (err) {
    // ignore and fall back to community
  }
  return "community";
}

export async function getSessions(): Promise<Session[]> {
  const membership = await getMembership();

  let types: string[] = [];
  if (membership === "academy") {
    types = ["club", "academy", "community"];
  } else if (membership === "club") {
    types = ["club", "community"];
  } else {
    types = ["community"];
  }

  const typeQuery = types.length ? `?types=${types.join(",")}` : "";
  const data = await apiGet<BackendSession[]>(`/api/v1/sessions/${typeQuery}`, { auth: true });

  const mapped = data.map(session => {
    const startDate = new Date(session.start_time);
    const endDate = new Date(session.end_time);

    return {
      id: session.id,
      title: session.title,
      description: session.description || "",
      location: session.location,
      date: startDate.toISOString(),
      startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: (session.type || "club").toLowerCase(),
      poolFee: session.pool_fee,
      rideShareFee: session.ride_share_fee ?? undefined,
    };
  });

  const allowed = new Set(types);
  return mapped.filter((session) => allowed.has(session.type || "club"));
}

export async function getSession(id: string): Promise<Session> {
  const session = await apiGet<BackendSession>(`/api/v1/sessions/${id}`, { auth: true });

  // Fetch ride share configs from transport service
  let rideShareAreas: RideShareArea[] = [];
  try {
    rideShareAreas = await apiGet<RideShareArea[]>(`/api/v1/transport/sessions/${id}/ride-configs`, { auth: true });
  } catch (e) {
    console.error("Failed to fetch ride configs", e);
  }

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  return {
    id: session.id,
    title: session.title,
    description: session.description || "",
    location: session.location,
    date: startDate.toISOString(),
    startTime: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: session.type || "club",
    poolFee: session.pool_fee,
    rideShareFee: session.ride_share_fee ?? undefined,
    rideShareAreas: rideShareAreas,
  };
}
