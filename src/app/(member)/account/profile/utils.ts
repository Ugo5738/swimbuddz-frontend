// Helpers + label maps extracted from page.tsx during the file-size sweep.

import { discoverySourceOptions } from "@/lib/options";
import {
  getPaidMembershipTier,
  getPaidMembershipTiers,
  getRequestedTiers,
  isTierPaid,
} from "@/lib/tiers";

import type { MemberResponse, Profile } from "./types";

export const levelLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const deepWaterLabels: Record<string, string> = {
  learning: "Learning",
  comfortable: "Comfortable",
  expert: "Expert",
};

export const travelFlexibilityLabels: Record<string, string> = {
  local_only: "Local sessions only",
  regional: "Regional travel is OK",
  global: "Global / relocation ready",
};

export const paymentReadinessLabels: Record<string, string> = {
  ready_now: "Ready to pay now",
  need_notice: "Need advance notice",
  sponsor_support: "Looking for sponsor support",
};

export const membershipTierLabels: Record<string, string> = {
  community: "Community",
  club: "Club",
  academy: "Academy",
};

export const discoverySourceLabels: Record<string, string> = Object.fromEntries(
  discoverySourceOptions.map((opt) => [opt.value, opt.label])
);

const tokenOverrides: Record<string, string> = {
  cpr: "CPR",
  im: "IM",
};

export function formatToken(value: string | null | undefined) {
  if (!value) return "";
  const override = tokenOverrides[value];
  if (override) return override;
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function mapMemberResponseToProfile(data: MemberResponse): Profile {
  const paidTiers = getPaidMembershipTiers(data);

  // Extract nested data with safe defaults
  const profile = data.profile || {};
  const emergency = data.emergency_contact || {};
  const availability = data.availability || {};
  const membership = data.membership || {};
  const preferences = data.preferences || {};

  return {
    id: data.id,
    name: `${data.first_name} ${data.last_name}`,
    joinedAt: data.created_at,
    email: data.email,
    phone: profile.phone || "",
    profilePhotoUrl: data.profile_photo_url || "",
    profilePhotoMediaId: data.profile_photo_media_id || "",
    city: profile.city || "",
    country: profile.country || "",
    timeZone: profile.time_zone || "",
    status: data.is_active ? "Active member" : "Inactive",
    role: "Member",
    swimLevel: profile.swim_level || "",
    deepWaterComfort: profile.deep_water_comfort || "",
    strokes: profile.strokes || [],
    interests: profile.interests || [],
    goalsNarrative: profile.personal_goals || "",

    availabilitySlots: availability.available_days || [],
    timeOfDayAvailability: availability.preferred_times || [],
    locationPreference: availability.preferred_locations || [],
    locationPreferenceOther: "",
    travelFlexibility: availability.travel_flexibility || "",
    facilityAccess: availability.accessible_facilities || [],
    facilityAccessOther: "",
    equipmentNeeds: availability.equipment_needed || [],
    equipmentNeedsOther: "",
    travelNotes: "",
    emergencyContactName: emergency.name || "",
    emergencyContactRelationship: emergency.contact_relationship || "",
    emergencyContactPhone: emergency.phone || "",
    emergencyContactRegion: emergency.region || "",
    medicalInfo: emergency.medical_info || "",
    safetyNotes: emergency.safety_notes || "",
    volunteerInterest: preferences.volunteer_interest || [],
    volunteerRolesDetail: preferences.volunteer_roles_detail || "",
    discoverySource: preferences.discovery_source || "other",
    socialInstagram: profile.social_instagram || "",
    socialLinkedIn: profile.social_linkedin || "",
    socialOther: profile.social_other || "",
    languagePreference: preferences.language_preference || "english",
    commsPreference: preferences.comms_preference || "whatsapp",
    paymentReadiness: preferences.payment_readiness || "",
    currencyPreference: preferences.currency_preference || "NGN",
    consentPhoto: preferences.consent_photo || "",
    membershipTier: getPaidMembershipTier(data),
    membershipTiers: paidTiers,
    requestedMembershipTiers: getRequestedTiers(data),
    academyFocusAreas: membership.academy_focus_areas || [],
    academyFocus: membership.academy_goals || "",
    paymentNotes: "",
    communityActive: isTierPaid(data, "community"),
    occupation: profile.occupation || "",
    areaInLagos: profile.area_in_lagos || "",
    communityPaidUntil: data.membership?.community_paid_until || null,
    clubPaidUntil: data.membership?.club_paid_until || null,
    academyPaidUntil: data.membership?.academy_paid_until || null,
  };
}
