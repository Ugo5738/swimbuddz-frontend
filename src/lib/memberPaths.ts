export type MemberStartPath = "community" | "club" | "academy";

const START_PATHS = new Set<MemberStartPath>(["community", "club", "academy"]);

/**
 * Translate public deep-link language into the stable identifiers still used
 * by the registration API. Unknown goals deliberately fall back to no
 * selection so a malformed campaign link cannot choose a product for someone.
 */
export function startPathFromGoal(value: string | null): MemberStartPath | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return START_PATHS.has(normalized as MemberStartPath)
    ? (normalized as MemberStartPath)
    : null;
}

/**
 * Club and Academy are independent programmes, not rungs in a tier ladder.
 * The annual SwimBuddz Membership is handled by each programme's server quote
 * according to its own policy, so an Academy request must never imply Club.
 */
export function requestedProgrammesForPath(path: MemberStartPath): MemberStartPath[] {
  return path === "community" ? [] : [path];
}

export function memberStartPathLabel(path: MemberStartPath | null): string {
  if (path === "club") return "Join Club";
  if (path === "academy") return "Learn through Academy";
  if (path === "community") return "SwimBuddz Membership";
  return "";
}
