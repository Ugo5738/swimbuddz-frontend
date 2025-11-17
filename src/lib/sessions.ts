import { apiPost } from "./api";

type SignInOptions = {
  sessionId: string;
  plan: "full" | "late" | "early";
  note?: string;
  rideShareRole: "none" | "passenger" | "driver";
  rideShareSeats?: number;
};

export async function signInToSession(options: SignInOptions) {
  return apiPost(
    `/api/v1/sessions/${options.sessionId}/sign-in`,
    {
      plan: options.plan,
      note: options.note,
      ride_share_role: options.rideShareRole,
      ride_share_seats: options.rideShareSeats
    },
    { auth: true }
  );
}
