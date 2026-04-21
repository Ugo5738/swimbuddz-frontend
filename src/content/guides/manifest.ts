/**
 * Manifest for public-facing guides rendered under /guides.
 *
 * Each entry points to a markdown file inside src/content/guides/ that has
 * been curated for external sharing (WhatsApp links, social posts, etc.).
 * Only register guides here that are safe for the open internet — internal
 * operational docs stay in the repo's top-level docs/ folder.
 *
 * To add a new guide:
 *   1. Drop the .md file into src/content/guides/
 *   2. Add a GuideMeta entry below
 *   3. Next's generateStaticParams picks it up on build
 */

export type GuideAudience = "volunteers" | "members" | "coaches" | "partners";

export type GuideMeta = {
  /** URL slug — becomes /guides/[slug]. Lowercase, kebab-case. */
  slug: string;
  /** Page title shown on the card and the detail page. */
  title: string;
  /** One-line summary for the card and the meta description. */
  description: string;
  /** Which audience group this guide belongs to on the index page. */
  audience: GuideAudience;
  /** Leading emoji for the card. */
  emoji: string;
  /** Filename inside src/content/guides/ (including extension). */
  file: string;
  /** Sort order within the audience group (lower = earlier). */
  order: number;
};

/**
 * Display labels for each audience group header on the index page.
 * Kept in the order groups should appear.
 */
export const AUDIENCE_LABELS: Record<GuideAudience, string> = {
  volunteers: "For Volunteers",
  members: "For Members",
  coaches: "For Coaches",
  partners: "For Partners",
};

export const GUIDES: GuideMeta[] = [
  {
    slug: "volunteer-roles",
    title: "Volunteer Roles, Tiers & Perks",
    description:
      "Every volunteer role at SwimBuddz — what you'll do, time commitment, and the tier system.",
    audience: "volunteers",
    emoji: "🤝",
    file: "volunteer-roles.md",
    order: 1,
  },
  {
    slug: "pool-ambassador",
    title: "Pool Ambassador Guide",
    description:
      "How to welcome curious onlookers at the pool and bring them into the SwimBuddz community.",
    audience: "volunteers",
    emoji: "👋",
    file: "pool-ambassador.md",
    order: 2,
  },
  {
    slug: "volunteer-group-guide",
    title: "The Volunteer WhatsApp Group",
    description:
      "What the group is for, how opportunities work, and how we celebrate the people who make SwimBuddz run.",
    audience: "volunteers",
    emoji: "💬",
    file: "volunteer-group-guide.md",
    order: 3,
  },
];
