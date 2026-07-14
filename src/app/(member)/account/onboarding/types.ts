// Types extracted from page.tsx during the file-size sweep.

export type MemberProfile = {
  phone?: string | null;
  area_in_lagos?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  time_zone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  swim_level?: string | null;
  deep_water_comfort?: string | null;
  strokes?: string[] | null;
  interests?: string[] | null;
  personal_goals?: string | null;
};

export type MemberEmergencyContact = {
  name?: string | null;
  contact_relationship?: string | null;
  phone?: string | null;
  medical_info?: string | null;
};

export type MemberAvailability = {
  available_days?: string[] | null;
  preferred_times?: string[] | null;
  preferred_locations?: string[] | null;
};

export type MemberMembership = {
  primary_tier?: string | null;
  active_tiers?: string[] | null;
  requested_tiers?: string[] | null;
  community_paid_until?: string | null;
  club_paid_until?: string | null;
  academy_paid_until?: string | null;
  paid_tier?: string | null;
  paid_tiers?: string[] | null;
  display_label?: string | null;
  tier_statuses?: Partial<
    Record<
      "community" | "club" | "academy",
      {
        tier: "community" | "club" | "academy";
        status:
          | "active"
          | "payment_pending"
          | "requested"
          | "approved_unpaid"
          | "expired"
          | "inactive";
        label: string;
        declared_active?: boolean;
      }
    >
  > | null;
  club_notes?: string | null;
  academy_skill_assessment?: Record<string, boolean> | null;
  academy_goals?: string | null;
  academy_preferred_coach_gender?: string | null;
  academy_lesson_preference?: string | null;
};

export type MemberPreferences = {
  comms_preference?: string | null;
  language_preference?: string | null;
  volunteer_interest?: string[] | null;
};

export type Member = {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_photo_url?: string | null;
  profile_photo_media_id?: string | null;

  // Nested sub-records
  profile?: MemberProfile | null;
  emergency_contact?: MemberEmergencyContact | null;
  availability?: MemberAvailability | null;
  membership?: MemberMembership | null;
  preferences?: MemberPreferences | null;
};

export type StepKey =
  | "core"
  | "safety"
  | "swim"
  | "club"
  | "academy"
  | "signals"
  | "review";

export type Step = { key: StepKey; title: string; required: boolean };

export type OnboardingDraft = {
  version: number;
  updatedAt: number;
  currentStep: StepKey;
  coreForm: {
    firstName: string;
    lastName: string;
    phone: string;
    areaInLagos: string;
    city: string;
    state: string;
    country: string;
    gender: string;
    dateOfBirth: string;
    profilePhotoUrl: string;
    timeZone: string;
  };
  clubForm: {
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
    medicalInfo: string;
    locationPreference: string[];
    timeOfDayAvailability: string[];
    clubNotes: string;
  };
  clubReadinessForm: {
    availabilitySlots: string[];
    clubNotes: string;
  };
  swimForm: {
    swimLevel: string;
    deepWaterComfort: string;
    strokes: string[];
    goals: string[];
    otherGoals: string;
  };
  academyForm: {
    academySkillAssessment: {
      canFloat: boolean;
      headUnderwater: boolean;
      deepWaterComfort: boolean;
      canSwim25m: boolean;
    };
    academyGoals: string;
    academyPreferredCoachGender: string;
    academyLessonPreference: string;
  };
  signalsForm: {
    interests: string[];
    volunteerInterest: string[];
  };
};
