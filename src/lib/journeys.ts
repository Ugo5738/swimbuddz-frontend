import { type MemberStartPath } from "@/lib/memberPaths";
import { safeReturnPath } from "@/lib/returnPath";

/**
 * Journey configuration is deliberately separate from the account, billing and
 * programme domains. These stages describe navigation, NOT entitlements.
 * Backend services remain authoritative for pricing, readiness, payments,
 * enrollment and attendance eligibility.
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

export type JourneyKind = "explore" | "academy" | "club" | "community" | "store" | "pool_access";

export interface JourneyDefinition {
  readonly kind: JourneyKind;
  readonly title: string;
  readonly stages: readonly JourneyStage[];
  readonly exploreHref: string;
}

export const JOURNEYS: Readonly<Record<JourneyKind, JourneyDefinition>> = {
  explore: {
    kind: "explore",
    title: "Explore SwimBuddz",
    stages: ["registration", "selection"],
    exploreHref: "/explore",
  },
  academy: {
    kind: "academy",
    title: "Learn to swim",
    stages: ["selection", "registration", "enrollment", "checkout", "activation", "onboarding"],
    exploreHref: "/academy",
  },
  club: {
    kind: "club",
    title: "Swim regularly",
    stages: ["selection", "registration", "application", "enrollment", "checkout", "activation", "onboarding"],
    exploreHref: "/club",
  },
  community: {
    kind: "community",
    title: "Join the community",
    stages: ["selection", "registration", "checkout", "activation", "onboarding"],
    exploreHref: "/community",
  },
  store: {
    kind: "store",
    title: "Shop swimming essentials",
    stages: ["shopping", "registration", "checkout"],
    exploreHref: "/store",
  },
  pool_access: {
    kind: "pool_access",
    title: "Find a pool",
    stages: ["selection", "registration", "checkout"],
    exploreHref: "/pools",
  },
};

/** A chosen offer can enter account creation without losing its destination. */
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

export function classifyJourneyDestination(destination: string | null | undefined): JourneyKind | null {
  const safe = safeReturnPath(destination);
  if (!safe) return null;
  const { pathname, searchParams } = new URL(safe, "https://swimbuddz.invalid");
  if (pathname === "/explore") return "explore";
  if (isPath(pathname, "/store") || isPath(pathname, "/account/orders")) return "store";
  if (isPath(pathname, "/pool-access") || isPath(pathname, "/pools")) return "pool_access";
  if (isPath(pathname, "/upgrade/academy") || isPath(pathname, "/account/academy") || (pathname === "/checkout" && searchParams.get("purpose") === "academy_cohort")) return "academy";
  if (isPath(pathname, "/upgrade/club") || isPath(pathname, "/account/club") || (pathname === "/checkout" && searchParams.get("purpose") === "club")) return "club";
  if (pathname === "/community" || (pathname === "/checkout" && searchParams.get("purpose") === "community")) return "community";
  return null;
}

export interface PostAuthJourneyContext {
  /** Validated same-origin destination from a prior selection or checkout. */
  destination?: string | null;
  requestedTiers?: readonly MemberStartPath[];
  communityActive?: boolean;
  academyActive?: boolean;
  clubActive?: boolean;
}

/**
 * Return the next actionable path, or null to let the existing member
 * dashboard/onboarding resolver handle a fully enrolled member.
 * Explicit user intent wins over inferred onboarding requirements: protected
 * routes are still checked independently by middleware and backend APIs.
 */
export function resolvePostAuthJourney(context: PostAuthJourneyContext): string | null {
  const destination = safeReturnPath(context.destination);
  if (destination) return destination;

  if (context.requestedTiers?.includes("academy") && !context.academyActive) {
    return "/upgrade/academy/cohort";
  }
  if (context.requestedTiers?.includes("club") && !context.clubActive) {
    return "/upgrade/club/readiness";
  }

  // An account is NOT an annual subscription. No selected product and no
  // paid swimming entitlement means the person is free to explore or shop.
  if (!context.communityActive && !context.clubActive && !context.academyActive) {
    return "/explore";
  }
  return null;
}
