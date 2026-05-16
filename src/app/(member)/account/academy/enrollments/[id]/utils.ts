// Helpers extracted from page.tsx during the file-size sweep.

import { KOBO_PER_NAIRA } from "@/lib/format";

// formatNaira here takes KOBO (storage unit) and returns a ₦ string.
// Intentionally different from lib/format.ts which takes naira directly.
export function formatNaira(kobo: number): string {
  return `₦${(kobo / KOBO_PER_NAIRA).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
