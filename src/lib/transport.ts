import { apiGet, apiPost } from "./api";

// Enums matching backend
export enum RideShareOption {
  NONE = "none",
  LEAD = "lead",
  JOIN = "join",
}

// Types for transport config
export interface RouteInfo {
  destination_name: string;
  distance: string;
  duration: string;
  departure_offset: number;
}

export interface PickupLocation {
  id: string;
  name: string;
  description: string;
  routes: Record<string, RouteInfo>;
}

export interface RideArea {
  id: string;
  name: string;
  slug: string;
  pickup_locations: PickupLocation[];
  routes: Record<string, RouteInfo>;
}

export interface TransportConfig {
  areas: RideArea[];
}

// Types for ride preferences
export interface RidePreference {
  ride_share_option: RideShareOption;
  needs_ride: boolean;
  can_offer_ride: boolean;
  ride_notes?: string;
  pickup_location?: string;
  member_id: string;
}

export interface RideSummaryItem {
  group: string;
  location: string | null;
  filled_seats: number;
  capacity: number;
  ride_number: number;
}

export interface RideSummary {
  active_group: string | null;
  active_location: string | null;
  rides: RideSummaryItem[];
}

// API functions
export async function getTransportConfig(): Promise<TransportConfig> {
  return apiGet<TransportConfig>("/api/v1/transport/config", { auth: false });
}

export async function upsertRidePreference(
  sessionId: string,
  preference: RidePreference,
): Promise<void> {
  return apiPost<void>(
    `/api/v1/transport/sessions/${sessionId}/rides`,
    preference,
    { auth: true },
  );
}

export async function getRideSummary(sessionId: string): Promise<RideSummary> {
  return apiGet<RideSummary>(
    `/api/v1/transport/sessions/${sessionId}/ride-summary`,
    { auth: true },
  );
}
