// Types extracted from page.tsx during the file-size sweep.

import type { ReactNode } from "react";

export type Profile = {
  id: string;
  name: string;
  joinedAt: string;
  email: string;
  phone: string;
  profilePhotoUrl?: string;
  profilePhotoMediaId?: string;
  city: string;
  country: string;
  timeZone: string;
  status: string;
  role: string;
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  interests: string[];
  goalsNarrative: string;
  occupation?: string;
  areaInLagos?: string;

  availabilitySlots: string[];
  timeOfDayAvailability: string[];
  locationPreference: string[];
  locationPreferenceOther: string;
  travelFlexibility: string;
  facilityAccess: string[];
  facilityAccessOther: string;
  equipmentNeeds: string[];
  equipmentNeedsOther: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string[];
  volunteerRolesDetail: string;
  discoverySource: string;
  socialInstagram: string;
  socialLinkedIn: string;
  socialOther: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTier: string; // legacy
  membershipTiers: string[];
  requestedMembershipTiers: string[];
  academyFocusAreas: string[];
  academyFocus: string;
  paymentNotes: string;
  communityActive: boolean;
  communityPaidUntil?: string | null;
  clubPaidUntil?: string | null;
  academyPaidUntil?: string | null;
};

export type MemberResponse = {
  id: string;
  auth_id: string;
  created_at: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  registration_complete: boolean;
  profile_photo_url?: string;
  profile_photo_media_id?: string;

  // Nested profile data
  profile?: {
    phone?: string;
    city?: string;
    country?: string;
    time_zone?: string;
    gender?: string;
    occupation?: string;
    area_in_lagos?: string;
    swim_level?: string;
    deep_water_comfort?: string;
    strokes?: string[];
    interests?: string[];
    personal_goals?: string;
    how_found_us?: string;
    social_instagram?: string;
    social_linkedin?: string;
    social_other?: string;
    show_in_directory?: boolean;
    interest_tags?: string[];
  } | null;

  // Nested emergency contact
  emergency_contact?: {
    name?: string;
    contact_relationship?: string;
    phone?: string;
    region?: string;
    medical_info?: string;
    safety_notes?: string;
  } | null;

  // Nested availability
  availability?: {
    available_days?: string[];
    preferred_times?: string[];
    preferred_locations?: string[];
    accessible_facilities?: string[];
    travel_flexibility?: string;
    equipment_needed?: string[];
  } | null;

  // Nested membership
  membership?: {
    primary_tier?: string;
    active_tiers?: string[];
    requested_tiers?: string[];
    community_paid_until?: string | null;
    club_paid_until?: string | null;
    academy_paid_until?: string | null;
    academy_focus_areas?: string[];
    academy_goals?: string;
  } | null;

  // Nested preferences
  preferences?: {
    language_preference?: string;
    comms_preference?: string;
    payment_readiness?: string;
    currency_preference?: string;
    consent_photo?: string;
    volunteer_interest?: string[];
    volunteer_roles_detail?: string;
    discovery_source?: string;
  } | null;
};

export type ProfileEditFormProps = {
  profile: Profile;
  onSuccess: (profile: Profile) => void;
  onCancel: () => void;
};

export type FormState = {
  phone: string;
  city: string;
  country: string;
  timeZone: string;
  occupation: string;
  areaInLagos: string;
  profilePhotoUrl: string;
  profilePhotoMediaId: string;
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  interests: string[];
  goalsNarrative: string;

  availabilitySlots: string[];
  timeOfDayAvailability: string[];
  locationPreference: string[];
  locationPreferenceOther: string;
  travelFlexibility: string;
  facilityAccess: string[];
  facilityAccessOther: string;
  equipmentNeeds: string[];
  equipmentNeedsOther: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string[];
  volunteerRolesDetail: string;
  discoverySource: string;
  socialInstagram: string;
  socialLinkedIn: string;
  socialOther: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocusAreas: string[];
  academyFocus: string;
  paymentNotes: string;
};

export type DetailProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  fullSpan?: boolean;
};
