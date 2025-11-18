import { supabase, getCurrentAccessToken } from "./auth";
import { apiPost } from "./api";

export type RegistrationPayload = {
  fullName: string;
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
  availability: string;
  timeOfDayAvailability: string;
  locationPreference: string;
  travelFlexibility: string;
  facilityAccess?: string;
  equipmentNeeds?: string;
  travelNotes?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo?: string;
  safetyNotes?: string;
  volunteerInterest: string;
  volunteerRoles?: string;
  discoverySource: string;
  socialHandles?: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocus?: string;
  paymentNotes?: string;
};

export async function registerMember(payload: RegistrationPayload, password: string) {
  const { error: signUpError } = await supabase.auth.signUp({
    email: payload.email,
    password,
    options: {
      data: {
        full_name: payload.fullName,
        phone: payload.phone,
        city: payload.city,
        country: payload.country
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
    city: payload.city,
    country: payload.country,
    time_zone: payload.timeZone,
    swim_level: payload.swimLevel,
    deep_water_comfort: payload.deepWaterComfort,
    strokes: payload.strokes,
    interests: payload.interests,
    goals: payload.goalsNarrative,
    // TODO: confirm final backend key for \"other goals\" text.
    goals_other: payload.goalsOther,
    certifications: payload.certifications,
    coaching_experience: payload.coachingExperience,
    availability: payload.availability,
    time_of_day_availability: payload.timeOfDayAvailability,
    location_preference: payload.locationPreference,
    travel_flexibility: payload.travelFlexibility,
    facility_access: payload.facilityAccess,
    equipment_needs: payload.equipmentNeeds,
    travel_notes: payload.travelNotes,
    emergency_contact_name: payload.emergencyContactName,
    emergency_contact_relationship: payload.emergencyContactRelationship,
    emergency_contact_phone: payload.emergencyContactPhone,
    emergency_contact_region: payload.emergencyContactRegion,
    medical_info: payload.medicalInfo,
    safety_notes: payload.safetyNotes,
    volunteer_interest: payload.volunteerInterest,
    volunteer_roles: payload.volunteerRoles,
    discovery_source: payload.discoverySource,
    social_handles: payload.socialHandles,
    language_preference: payload.languagePreference,
    comms_preference: payload.commsPreference,
    payment_readiness: payload.paymentReadiness,
    currency_preference: payload.currencyPreference,
    consent_photo: payload.consentPhoto,
    // TODO: align membership tier enum values with backend contract.
    membership_tiers: payload.membershipTiers,
    academy_focus: payload.academyFocus,
    payment_notes: payload.paymentNotes
  };

  await apiPost("/api/v1/members", backendPayload, { auth: true });
}
