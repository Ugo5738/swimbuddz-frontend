// Helpers extracted from `src/app/page.tsx` during the file-size sweep.

/** Guard against UUIDs or missing names showing in the UI */
export function getDisplayName(name: string | null | undefined): string {
  if (!name) return "Volunteer";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return "Volunteer";
  return name;
}

/** Returns a seasonal tagline based on the current month */
export function getSeasonalTagline(): string {
  const month = new Date().getMonth(); // 0-indexed
  if (month <= 2) return "New year, new stroke — start your swimming journey";
  if (month <= 5) return "Beat the heat — swim with the community";
  if (month <= 8) return "Rain or shine, we're in the pool";
  return "Ember month is swim month — join 60+ swimmers";
}
