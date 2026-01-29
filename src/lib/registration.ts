import { apiGet, apiPost } from "./api";
import { getCurrentAccessToken } from "./auth";

export type PendingCompletionStatus =
  | { status: "none" }
  | { status: "completed" }
  | { status: "error"; message: string };

// Nested types matching new API response structure
type MemberProfileData = {
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  time_zone?: string | null;
  swim_level?: string | null;
  deep_water_comfort?: string | null;
  personal_goals?: string | null;
};

type MemberEmergencyContactData = {
  name?: string | null;
  contact_relationship?: string | null;
  phone?: string | null;
};

type MemberAvailabilityData = {
  available_days?: string[] | null;
  preferred_times?: string[] | null;
  preferred_locations?: string[] | null;
};

type MemberMembershipData = {
  primary_tier?: string | null;
  active_tiers?: string[] | null;
  requested_tiers?: string[] | null;
  community_paid_until?: string | null;
  club_paid_until?: string | null;
  academy_paid_until?: string | null;
  academy_skill_assessment?: Record<string, boolean> | null;
  academy_goals?: string | null;
  academy_preferred_coach_gender?: string | null;
  academy_lesson_preference?: string | null;
};

type CoachProfileData = {
  status?: string | null;
};

type MemberForRedirect = {
  roles?: string[] | null;
  profile_photo_url?: string | null;
  profile_photo_media_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;

  // Nested sub-records
  profile?: MemberProfileData | null;
  emergency_contact?: MemberEmergencyContactData | null;
  availability?: MemberAvailabilityData | null;
  membership?: MemberMembershipData | null;
  coach_profile?: CoachProfileData | null;
};

function parseDateMs(value: any): number | null {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

export type PendingRegistrationPayload = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;

  // Nested profile input
  profile?: {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    area_in_lagos?: string;
    swim_level?: string;
  };
  preferences?: {
    community_rules_accepted?: boolean;
  };
  membership?: {
    primary_tier?: "community";
    active_tiers?: string[];
    requested_tiers?: string[];
  };
};

export async function createPendingRegistration(payload: PendingRegistrationPayload) {
  await apiPost("/api/v1/pending-registrations/", payload);
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

export async function getPostAuthRedirectPath(): Promise<string> {
  try {
    const member = await apiGet<MemberForRedirect>("/api/v1/members/me", { auth: true });
    const now = Date.now();

    // Check if user is a coach - redirect to coach flow instead of member onboarding
    const roles = (member.roles || []).map(r => String(r).toLowerCase());
    const hasCoachRole = roles.includes("coach");
    const coachStatus = member.coach_profile?.status
      ? String(member.coach_profile.status).toLowerCase()
      : null;

    // Coaches in application or review states should stay in the coach flow.
    if (hasCoachRole) {
      if (coachStatus === "approved") {
        return "/coach/onboarding";
      }

      const needsCoachFlow = !coachStatus || [
        "draft",
        "pending_review",
        "more_info_needed",
        "rejected",
        "inactive",
        "suspended",
      ].includes(coachStatus);

      if (needsCoachFlow) {
        return "/coach/apply";
      }

      if (coachStatus === "active") {
        return "/coach/dashboard";
      }
    }

    // Use nested membership data
    const membership = member.membership;
    const profile = member.profile;
    const emergency = member.emergency_contact;
    const availability = member.availability;

    const communityUntilMs = parseDateMs(membership?.community_paid_until);
    const communityActive = communityUntilMs !== null && communityUntilMs > now;

    const clubUntilMs = parseDateMs(membership?.club_paid_until);
    const clubActive = clubUntilMs !== null && clubUntilMs > now;

    const academyUntilMs = parseDateMs(membership?.academy_paid_until);
    const academyActive = academyUntilMs !== null && academyUntilMs > now;

    const approvedTiers = (membership?.active_tiers && membership.active_tiers.length > 0)
      ? membership.active_tiers
      : membership?.primary_tier
        ? [membership.primary_tier]
        : ["community"];

    const requestedTiers = (membership?.requested_tiers || []).map((t) => String(t).toLowerCase());
    const wantsAcademy = requestedTiers.includes("academy");
    const wantsClub = requestedTiers.includes("club") || wantsAcademy;

    const clubContext = wantsClub || approvedTiers.map(String).map((t) => t.toLowerCase()).some((t) => t === "club" || t === "academy");
    const academyContext = wantsAcademy || approvedTiers.map(String).map((t) => t.toLowerCase()).includes("academy");

    // Use profile_photo_media_id (source of truth) not profile_photo_url
    const hasCoreOnboarding = Boolean(
      member.profile_photo_media_id &&
      profile?.gender &&
      profile?.date_of_birth &&
      profile?.phone &&
      profile?.country &&
      profile?.city &&
      profile?.time_zone
    );

    const hasSafetyLogistics = Boolean(
      emergency?.name &&
      emergency?.contact_relationship &&
      emergency?.phone &&
      availability?.preferred_locations && availability.preferred_locations.length > 0 &&
      availability?.preferred_times && availability.preferred_times.length > 0
    );

    const hasSwimBackground = Boolean(
      profile?.swim_level &&
      profile?.deep_water_comfort &&
      profile?.personal_goals &&
      String(profile.personal_goals).trim()
    );

    const hasClubReadiness = !clubContext || Boolean(availability?.available_days && availability.available_days.length > 0);

    const assessment = membership?.academy_skill_assessment;
    const hasAssessment =
      assessment &&
      ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some(
        (k) => Object.prototype.hasOwnProperty.call(assessment, k)
      );

    const hasAcademyReadiness = Boolean(
      hasAssessment &&
      membership?.academy_goals &&
      membership?.academy_preferred_coach_gender &&
      membership?.academy_lesson_preference
    );

    const onboardingComplete = hasCoreOnboarding && hasSafetyLogistics && hasSwimBackground && hasClubReadiness && (!academyContext || hasAcademyReadiness);
    if (!onboardingComplete) {
      return "/account/onboarding";
    }

    if (!communityActive) {
      return "/account/billing?required=community";
    }

    if (academyActive) return "/account/academy";
    if (clubContext && !clubActive) return "/account/billing?required=club";

    return "/account";
  } catch {
    return "/account";
  }
}
