import { apiPost, apiGet } from "./api";
import { RideShareOption } from "./transport";

type SignInOptions = {
  sessionId: string;
  status: string; // PRESENT, LATE, EARLY
  notes?: string;
  ride_share_option: RideShareOption;
  needs_ride: boolean;
  can_offer_ride: boolean;
  pickup_location?: string;
};

export async function signInToSession(options: SignInOptions) {
  return apiPost(
    `/api/v1/sessions/${options.sessionId}/sign-in`,
    {
      status: options.status,
      role: "SWIMMER", // Default role
      notes: options.notes,
      ride_share_option: options.ride_share_option,
      needs_ride: options.needs_ride,
      can_offer_ride: options.can_offer_ride,
      pickup_location: options.pickup_location
    },
    { auth: true }
  );
}

export interface Session {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  poolFee: number;
  rideShareFee?: number;
}

interface BackendSession {
  id: string;
  title: string;
  description: string | null;
  location: string;
  pool_fee: number;
  capacity: number;
  start_time: string;
  end_time: string;
}

export async function getSessions(): Promise<Session[]> {
  const data = await apiGet<BackendSession[]>("/api/v1/sessions", { auth: true });

  return data.map(session => {
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
      type: "CLUB_SESSION", // Default as it's not in the API response yet
      poolFee: session.pool_fee,
    };
  });
}

export async function getSession(id: string): Promise<Session> {
  const session = await apiGet<BackendSession>(`/api/v1/sessions/${id}`, { auth: true });

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
    type: "CLUB_SESSION",
    poolFee: session.pool_fee,
  };
}
