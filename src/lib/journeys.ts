import { safeReturnPath } from "@/lib/returnPath";

/**
 * The journey coordinator chooses the next UI step. It NEVER grants member
 * access, calculates a price or confirms enrollment/payment. Those decisions
 * remain with the backend and route access guards.
 */
export type JourneyStage =
  | "registration"
  | "selection"
  | "application"
  | "enrollment"
  | "checkout"
  | "activation"
  | "onboarding"
  | "shopping";

export type JourneyKind =
  | "explore"
  | "academy"
  | "club"
  | "community"
  | "store"
  | "pool_access";

export interface JourneyDefinition {
  readonly kind: JourneyKind;
  readonly title: string;
  readonly stages: readonly JourneyStage[];
  readonly exploreHref: string;
}

export const JOURNEYS: Readonly<Record<JourneyKind, JourneyDefinition>> = {
  explore: {
    kind: "explore", title: "Explore SwimBuddz",
    stages: ["registration", "selection"], exploreHref: "/explore",
  },
  academy: {
    kind: "academy", title: "Learn to swim",
    stages: ["selection", "registration", "enrollment", "checkout", "activation", "onboarding"],
    exploreHref: "/academy",
  },
  club: {
    kind: "club", title: "Swim regularly",
    stages: ["selection", "registration", "application", "enrollment", "checkout", "activation", "onboarding"],
    exploreHref: "/club",
  },
  community: {
    kind: "community", title: "Join the community",
    stages: ["selection", "registration", "checkout", "activation", "onboarding"],
    exploreHref: "/community",
  },
  store: {
    kind: "store", title: "Shop swimming essentials",
    stages: ["shopping", "registration", "checkout"], exploreHref: "/store",
  },
  pool_access: {
    kind: "pool_access", title: "Find a pool",
    stages: ["selection", "registration", "checkout"], exploreHref: "/pools",
  },
};

/** Preserve the selected product across registration and email verification. */
export function destinationForGoal(goal: string | null | undefined): string | null {
  switch (goal?.trim().toLowerCase()) {
    case "academy": return "/upgrade/academy/cohort";
    case "club": return "/upgrade/club/readiness";
    case "community": return "/checkout?purpose=community";
    case "store": return "/store";
    case "pool":
    case "pools":
    case "pool_access": return "/pools";
    default: return null;
  }
}

function isPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Only explicit offering-related destinations bypass generic onboarding. */
export function classifyJourneyDestination(
  destination: string | null | undefined
): JourneyKind | null {
  const safe = safeReturnPath(destination);
  if (!safe) return null;
  const { pathname, searchParams } = new URL(safe, "https://swimbuddz.invalid");
  if (isPath(pathname, "/explore")) return "explore";
  if (isPath(pathname, "/store") || isPath(pathname, "/account/orders")) return "store";
  if (isPath(pathname, "/pool-access") || isPath(pathname, "/pools")) return "pool_access";
  if (
    isPath(pathname, "/upgrade/academy") ||
    isPath(pathname, "/account/academy") ||
    (pathname === "/checkout" && searchParams.get("purpose") === "academy_cohort")
  ) return "academy";
  if (
    isPath(pathname, "/upgrade/club") ||
    isPath(pathname, "/account/club") ||
    (pathname === "/checkout" && searchParams.get("purpose") === "club")
  ) return "club";
  if (
    isPath(pathname, "/community") ||
    (pathname === "/checkout" && searchParams.get("purpose") === "community")
  ) return "community";
  return null;
}

export interface PostAuthJourneyContext {
  destination?: string | null;
  /** Input from the membership API; validate values, never trust the type. */
  requestedTiers?: readonly string[];
  communityActive?: boolean;
  academyActive?: boolean;
  clubActive?: boolean;
  isFreshRegistration?: boolean;
}

export function resolvePostAuthJourney(context: PostAuthJourneyContext): string | null {
  const destination = safeReturnPath(context.destination);
  if (destination) {
    // Standalone commerce/programme destinations resume immediately.
    // Other explicit destinations must remain with the existing onboarding
    // resolver. A stale programme request must not hijack session deep links.
    return classifyJourneyDestination(destination) ? destination : null;
  }

  // A selected offering's enrollment/readiness continues independently of
  // the annual Community membership and without a new account.
  if (context.requestedTiers?.includes("academy") && !context.academyActive) {
    return "/upgrade/academy/cohort";
  }
  if (context.requestedTiers?.includes("club") && !context.clubActive) {
    return "/upgrade/club/readiness";
  }

  // Only *fresh* identity-only accounts default to discovery. Existing members
  // with expired or unpaid plans still use the established billing resolver.
  if (
    context.isFreshRegistration &&
    !context.communityActive &&
    !context.clubActive &&
    !context.academyActive
  ) return "/explore";
  return null;
}
