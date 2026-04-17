import { LinkCard, type LinkCardProps } from "@/components/links/LinkCard";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { API_BASE_URL } from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start here · SwimBuddz",
  description:
    "Nigeria's first swimming community. Learn to swim, train with a crew, or just vibe — pick your starting point.",
};

// Re-fetch cohort data every 5 minutes so the top link stays fresh
// without hammering the academy service on every pageview.
export const revalidate = 300;

// ─── Types ───────────────────────────────────────────────────────────
type Cohort = {
  id: string;
  name: string;
  start_date: string;
  location_name: string | null;
  status: string;
  program_id: string;
};

// ─── Static link list (Ch. 5 order — top one is dynamic, rest are stable) ──
const SECONDARY_LINKS: LinkCardProps[] = [
  {
    linkId: "club",
    emoji: "💪",
    label: "I want to train with a crew",
    sublabel: "Weekly Club sessions",
    href: "/club",
  },
  {
    linkId: "community",
    emoji: "🌊",
    label: "I just want to vibe",
    sublabel: "Community — events, open swims, the lot",
    href: "/community",
  },
  {
    linkId: "sessions",
    emoji: "📅",
    label: "Upcoming sessions",
    href: "/sessions-and-events",
  },
  {
    linkId: "store",
    emoji: "🛒",
    label: "SwimBuddz Store",
    href: "/store",
  },
  {
    linkId: "whatsapp_new_here",
    emoji: "💬",
    label: "Join our WhatsApp",
    sublabel: "New Here? group — say hi, meet the pod",
    href: "https://chat.whatsapp.com/J1hc1cr4ZkQ78CpHbSKWQq?mode=gi_t",
    external: true,
  },
];

// ─── Dynamic top-link logic ───────────────────────────────────────────

/** Fetch cohorts members can enroll in right now. Returns [] on any error. */
async function fetchEnrollableCohorts(): Promise<Cohort[]> {
  if (!API_BASE_URL) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/academy/cohorts/enrollable`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Cohort[];
  } catch {
    // Network/API down — fall back to the static default so /links never breaks.
    return [];
  }
}

function formatStart(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Compute the primary link card. When a cohort is open, surface its start
 * date + location so visitors see urgency and destination in one glance.
 * Falls back to the evergreen default when nothing is enrollable.
 */
function buildPrimaryLink(cohorts: Cohort[]): LinkCardProps {
  // Sort by start_date asc; pick the earliest
  const next = [...cohorts].sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  if (!next) {
    return {
      linkId: "academy_default",
      emoji: "🏊",
      label: "I want to learn to swim",
      sublabel: "Join the next Academy cohort",
      href: "/academy",
      primary: true,
    };
  }

  const when = formatStart(next.start_date);
  const where = next.location_name?.trim();

  return {
    linkId: "academy_cohort_open",
    emoji: "🏊",
    label: "Join the next Academy cohort",
    sublabel: where ? `Starts ${when} · ${where}` : `Starts ${when}`,
    href: "/academy",
    primary: true,
    trackingParams: {
      cohort_id: next.id,
      cohort_status: next.status,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────
export default async function LinksPage() {
  const cohorts = await fetchEnrollableCohorts();
  const primary = buildPrimaryLink(cohorts);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-8 sm:py-12">
      {/* Header */}
      <img
        src="/logo.png"
        alt="SwimBuddz"
        className="mb-4 h-20 w-20 rounded-full object-cover shadow-sm ring-1 ring-slate-200"
      />
      <h1 className="text-2xl font-bold text-slate-900">SwimBuddz</h1>
      <p className="mt-1 text-center text-sm text-slate-600">
        Nigeria&apos;s first swimming community.
        <br />
        Learn. Train. Belong.
      </p>
      <p className="mt-2 text-xs text-slate-500">📍 Lagos</p>

      {/* Link list */}
      <nav className="mt-8 flex w-full flex-col gap-3" aria-label="Start here">
        <LinkCard {...primary} />
        {SECONDARY_LINKS.map((link) => (
          <LinkCard key={link.linkId} {...link} />
        ))}
      </nav>

      {/* Socials */}
      <SocialLinks size={6} className="mt-10 gap-5" />

      <p className="mt-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} SwimBuddz
      </p>
    </div>
  );
}
