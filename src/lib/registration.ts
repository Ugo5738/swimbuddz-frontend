import { apiGet, apiPost } from "./api";
import { getCurrentAccessToken } from "./auth";

export type PendingCompletionStatus =
  | { status: "none" }
  | { status: "completed" }
  | { status: "error"; message: string };

type MemberForRedirect = {
  membership_tier?: string | null;
  membership_tiers?: string[] | null;
  requested_membership_tiers?: string[] | null;
  roles?: string[] | null;
  community_paid_until?: string | null;
  club_paid_until?: string | null;
  academy_paid_until?: string | null;

  profile_photo_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  city?: string | null;
  country?: string | null;
  time_zone?: string | null;
  swim_level?: string | null;
  deep_water_comfort?: string | null;
  goals_narrative?: string | null;

  availability_slots?: string[] | null;
  emergency_contact_name?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_phone?: string | null;
  location_preference?: string[] | null;
  time_of_day_availability?: string[] | null;

  academy_skill_assessment?: Record<string, boolean> | null;
  academy_goals?: string | null;
  academy_preferred_coach_gender?: string | null;
  academy_lesson_preference?: string | null;
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

  phone?: string;
  city?: string;
  country?: string;
  area_in_lagos?: string;
  swim_level?: string;

  membership_tier?: "community";
  membership_tiers?: string[];
  requested_membership_tiers?: string[];
  community_rules_accepted?: boolean;
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
    const isCoach = roles.includes("coach");

    // Coaches should always land in the coach application/status flow first.
    if (isCoach) {
      return "/coach/apply";
    }

    const communityUntilMs = parseDateMs(member.community_paid_until);
    const communityActive = communityUntilMs !== null && communityUntilMs > now;

    const clubUntilMs = parseDateMs(member.club_paid_until);
    const clubActive = clubUntilMs !== null && clubUntilMs > now;

    const academyUntilMs = parseDateMs(member.academy_paid_until);
    const academyActive = academyUntilMs !== null && academyUntilMs > now;

    const approvedTiers = (member.membership_tiers && member.membership_tiers.length > 0)
      ? member.membership_tiers
      : member.membership_tier
        ? [member.membership_tier]
        : ["community"];

    const requestedTiers = (member.requested_membership_tiers || []).map((t) => String(t).toLowerCase());
    const wantsAcademy = requestedTiers.includes("academy");
    const wantsClub = requestedTiers.includes("club") || wantsAcademy;

    const clubContext = wantsClub || approvedTiers.map(String).map((t) => t.toLowerCase()).some((t) => t === "club" || t === "academy");
    const academyContext = wantsAcademy || approvedTiers.map(String).map((t) => t.toLowerCase()).includes("academy");

    const hasCoreOnboarding = Boolean(
      member.profile_photo_url &&
      member.gender &&
      member.date_of_birth &&
      member.phone &&
      member.country &&
      member.city &&
      member.time_zone
    );

    const hasSafetyLogistics = Boolean(
      member.emergency_contact_name &&
      member.emergency_contact_relationship &&
      member.emergency_contact_phone &&
      member.location_preference && member.location_preference.length > 0 &&
      member.time_of_day_availability && member.time_of_day_availability.length > 0
    );

    const hasSwimBackground = Boolean(
      member.swim_level &&
      member.deep_water_comfort &&
      member.goals_narrative &&
      String(member.goals_narrative).trim()
    );

    const hasClubReadiness = !clubContext || Boolean(member.availability_slots && member.availability_slots.length > 0);

    const assessment = member.academy_skill_assessment;
    const hasAssessment =
      assessment &&
      ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some(
        (k) => Object.prototype.hasOwnProperty.call(assessment, k)
      );

    const hasAcademyReadiness = Boolean(
      hasAssessment &&
      member.academy_goals &&
      member.academy_preferred_coach_gender &&
      member.academy_lesson_preference
    );

    const onboardingComplete = hasCoreOnboarding && hasSafetyLogistics && hasSwimBackground && hasClubReadiness && (!academyContext || hasAcademyReadiness);
    if (!onboardingComplete) {
      return "/dashboard/onboarding";
    }

    if (!communityActive) {
      return "/dashboard/billing?required=community";
    }

    if (academyActive) return "/dashboard/academy";
    if (clubContext && !clubActive) return "/dashboard/billing?required=club";

    return "/dashboard";
  } catch {
    return "/dashboard";
  }
}
