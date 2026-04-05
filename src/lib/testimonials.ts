/**
 * Testimonials — backend-sourced, with local fallback.
 *
 * `fetchTestimonials(track)` calls the public testimonials endpoint on
 * communications_service. If the backend is empty or unreachable, the
 * static `LOCAL_TESTIMONIALS` list is returned so the UI never shows
 * nothing during rollout.
 *
 * To manage the live bank: seed/edit via the admin endpoints exposed at
 *   POST/PATCH/DELETE /api/v1/communications/admin/testimonials
 */

import { API_BASE_URL } from "@/lib/config";

export type TestimonialTrack = "academy" | "club" | "community" | "all";

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  since?: string;
  initials: string;
  photo_url?: string;
  tracks: TestimonialTrack[];
};

// ── Backend DTO ────────────────────────────────────────────────────────

type BackendTestimonial = {
  id: string;
  author_name: string;
  author_role: string;
  author_since?: string | null;
  author_initials: string;
  author_photo_url?: string | null;
  quote: string;
  tracks: string[];
  is_published: boolean;
  sort_order: number;
};

function toTestimonial(t: BackendTestimonial): Testimonial {
  return {
    id: t.id,
    quote: t.quote,
    name: t.author_name,
    role: t.author_role,
    since: t.author_since ?? undefined,
    initials: t.author_initials,
    photo_url: t.author_photo_url ?? undefined,
    tracks: (t.tracks as TestimonialTrack[]) ?? [],
  };
}

// ── Local fallback list ────────────────────────────────────────────────

export const LOCAL_TESTIMONIALS: Testimonial[] = [
  {
    id: "uche-2025",
    quote:
      "When I joined, I couldn't put my face in the water. 3 months later, I swam my first 50 meters. SwimBuddz changed everything for me.",
    name: "Uche",
    role: "Academy Graduate",
    since: "2025",
    initials: "UO",
    tracks: ["academy", "all"],
  },
  {
    id: "onyinye-2025",
    quote:
      "The group energy keeps me showing up, even on slow days. I've never been this consistent with anything fitness-related.",
    name: "Onyinye",
    role: "Club Member",
    since: "2025",
    initials: "OO",
    tracks: ["club", "all"],
  },
  {
    id: "esther-2026",
    quote:
      "I was terrified of deep water my whole life. Now I swim in the deep end every Saturday. The coaches and community made all the difference.",
    name: "Esther",
    role: "Community Member",
    since: "2026",
    initials: "EA",
    tracks: ["community", "academy", "all"],
  },
];

/** Sync local-only filter — used as fallback when backend unavailable. */
export function getLocalTestimonials(track: TestimonialTrack): Testimonial[] {
  return LOCAL_TESTIMONIALS.filter((t) => t.tracks.includes(track));
}

/** Legacy alias. Prefer `fetchTestimonials` for live data. */
export const getTestimonials = getLocalTestimonials;

/**
 * Fetch testimonials from the backend. Falls back to the local list on
 * empty response, network errors, or non-2xx status.
 *
 * `track` filters server-side (omit for all published testimonials).
 */
export async function fetchTestimonials(track?: TestimonialTrack): Promise<Testimonial[]> {
  const query = track ? `?track=${encodeURIComponent(track)}&limit=20` : "?limit=20";
  const url = `${API_BASE_URL}/api/v1/communications/testimonials/public${query}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return track ? getLocalTestimonials(track) : LOCAL_TESTIMONIALS;
    }
    const data = (await res.json()) as BackendTestimonial[];
    if (!Array.isArray(data) || data.length === 0) {
      return track ? getLocalTestimonials(track) : LOCAL_TESTIMONIALS;
    }
    return data.map(toTestimonial);
  } catch {
    return track ? getLocalTestimonials(track) : LOCAL_TESTIMONIALS;
  }
}
