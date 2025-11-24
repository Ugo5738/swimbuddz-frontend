import { supabase, getCurrentAccessToken } from "./auth";
import { apiPost } from "./api";

export type RegistrationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  timeZone: string;
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  interests: string[];
  goalsNarrative: string;
  goalsOther?: string;
  certifications: string[];
  coachingExperience?: string;
  coachingSpecialties: string[];
  coachingYears?: string;
  coachingPortfolioLink?: string;
  coachingDocumentLink?: string;
  coachingDocumentFileName?: string;
  availabilitySlots: string[];
  timeOfDayAvailability: string[];
  locationPreference: string[];
  locationPreferenceOther?: string;
  travelFlexibility: string;
  facilityAccess?: string[];
  facilityAccessOther?: string;
  equipmentNeeds?: string[];
  equipmentNeedsOther?: string;
  travelNotes?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo?: string;
  safetyNotes?: string;
  volunteerInterest: string[];
  volunteerRolesDetail?: string;
  discoverySource: string;
  socialInstagram?: string;
  socialLinkedIn?: string;
  socialOther?: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocusAreas: string[];
  academyFocus?: string;
  paymentNotes?: string;
};

export type RegistrationResult =
  | { status: "complete" }
  | { status: "email_confirmation_required" };

export type PendingCompletionStatus =
  | { status: "none" }
  | { status: "completed" }
  | { status: "error"; message: string };

export async function registerMember(payload: RegistrationPayload, password: string): Promise<RegistrationResult> {
  const { data, error: signUpError } = await supabase.auth.signUp({
    email: payload.email,
    password,
    options: {
      data: {
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone: payload.phone,
        city: payload.city,
        country: payload.country
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (signUpError) {
    throw new Error(signUpError.message);
  }

  const supabaseUserId = data.user?.id;

  if (!supabaseUserId) {
    throw new Error("Unable to determine Supabase user ID after sign-up.");
  }

  await savePendingRegistrationToBackend(supabaseUserId, payload);

  const token = await getCurrentAccessToken();

  if (!token) {
    return { status: "email_confirmation_required" };
  }

  const completion = await completePendingRegistrationOnBackend();
  if (completion.status === "error") {
    throw new Error(completion.message);
  }

  return { status: "complete" };
}

export async function completePendingRegistrationOnBackend(): Promise<PendingCompletionStatus> {
  const token = await getCurrentAccessToken();
  if (!token) {
    return { status: "none" };
  }

  try {
    await apiPost("/api/v1/pending-registrations/complete", undefined, { auth: true });
    return { status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to finish registration.";
    // If the member already exists or pending is gone (race condition/idempotency), consider success
    if (
      message.includes("already exists") ||
      message.includes("Pending registration not found") ||
      (error as any)?.response?.status === 400 ||
      (error as any)?.response?.status === 404
    ) {
      return { status: "completed" };
    }
    return { status: "error", message };
  }
}

async function savePendingRegistrationToBackend(userId: string, payload: RegistrationPayload) {
  // Backend expects snake_case fields at the top level
  const backendPayload = {

    first_name: payload.firstName,
    last_name: payload.lastName,
    // We can pass other fields if the backend schema allows extra fields or if we want to store them in profile_data_json
    // The backend currently takes the whole body and dumps it to JSON for profile_data
    ...payload
  };

  await apiPost("/api/v1/pending-registrations/", backendPayload);
}
