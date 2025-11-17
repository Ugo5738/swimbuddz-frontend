import { supabase, getCurrentAccessToken } from "./auth";
import { apiPost } from "./api";

export type RegistrationPayload = {
  fullName: string;
  email: string;
  phone: string;
  swimLevel: string;
  goals: string;
  availability: string;
  locationPreference: string;
  emergencyContact: string;
  medicalInfo?: string;
  volunteerInterest: string;
  commsPreference: string;
  consentPhoto: string;
};

export async function registerMember(payload: RegistrationPayload, password: string) {
  const { error: signUpError } = await supabase.auth.signUp({
    email: payload.email,
    password,
    options: {
      data: {
        full_name: payload.fullName,
        phone: payload.phone
      }
    }
  });

  if (signUpError) {
    throw new Error(signUpError.message);
  }

  const token = await getCurrentAccessToken();

  if (!token) {
    throw new Error("Unable to retrieve access token after sign-up.");
  }

  const backendPayload = {
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    swim_level: payload.swimLevel,
    goals: payload.goals,
    availability: payload.availability,
    location_preference: payload.locationPreference,
    emergency_contact: payload.emergencyContact,
    medical_info: payload.medicalInfo,
    volunteer_interest: payload.volunteerInterest,
    comms_preference: payload.commsPreference,
    consent_photo: payload.consentPhoto
  };

  await apiPost("/api/v1/members", backendPayload, { auth: true });
}
