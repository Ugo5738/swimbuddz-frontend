/**
 * Admin make-up scheduling API client.
 *
 * Types are generated from the backend OpenAPI schema — run
 * `npm run generate:types` after backend changes.
 */
import { apiGet, apiPost } from "./api";
import type { components } from "./api-types";

export type BookableSlot = components["schemas"]["BookableSlotResponse"];
export type BookableSlotsResponse =
  components["schemas"]["BookableSlotsResponse"];
export type MakeupBooking = components["schemas"]["MakeupBookingResponse"];
export type MakeupBookingCreate = components["schemas"]["MakeupBookingCreate"];
export type MakeupOrigin = MakeupBookingCreate["origin"];

/** Origins an admin can pick when confirming a make-up (matches backend enum). */
export const MAKEUP_ORIGINS: { value: MakeupOrigin; label: string }[] = [
  { value: "excused_absence", label: "Excused absence" },
  { value: "session_cancelled", label: "Session cancelled" },
  { value: "late_join", label: "Late join" },
  { value: "learner_reschedule", label: "Learner reschedule" },
];

export const MakeupsApi = {
  /** Open slots + joinable sessions for a coach + learner over a date window. */
  bookableSlots: (p: {
    coachId: string;
    learnerId: string;
    from: string;
    to: string;
  }) =>
    apiGet<BookableSlotsResponse>(
      `/api/v1/makeups/bookable-slots?coach_id=${p.coachId}&learner_id=${p.learnerId}&from=${p.from}&to=${p.to}`,
      { auth: true },
    ),

  /** Confirm a make-up against a chosen session. */
  confirm: (body: MakeupBookingCreate) =>
    apiPost<MakeupBooking>("/api/v1/makeups/bookings", body, { auth: true }),

  /** A learner's make-up bookings (newest first). */
  listForLearner: (learnerId: string) =>
    apiGet<MakeupBooking[]>(`/api/v1/makeups/bookings?learner_id=${learnerId}`, {
      auth: true,
    }),
};
