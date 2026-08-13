import { MeetThePods } from "@/components/club/MeetThePods";
import { SkillLaddersShowcase } from "@/components/club/SkillLaddersShowcase";
import { Card } from "@/components/ui/Card";
import {
  ArrowRight,
  Compass,
  Megaphone,
  Star,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Static content
//
// The page is mostly static marketing content — the only dynamic pieces are
// <MeetThePods /> (fetches /api/v1/members/pods/public) and
// <SkillLaddersShowcase /> (fetches /api/v1/challenges/series/list).
// Both auto-hide / fall back gracefully if the backend has no data yet.
// ---------------------------------------------------------------------------

const journey = [
  {
    step: 1,
    title: "Choose a location",
    body: "See the price for each pool, choose the current quarter, and optionally add future quarters. Mid-quarter prices adjust to the sessions remaining.",
  },
  {
    step: 2,
    title: "Complete readiness",
    body: "Tell us about your water safety and swimming baseline, then complete a short, consistent in-pool assessment.",
  },
  {
    step: 3,
    title: "Review and pay",
    body: "Your quote shows every selected quarter, annual membership if due, the optional Community Experience, and any payment charge as separate lines.",
  },
  {
    step: 4,
    title: "Join your pod and practise",
    body: "Swim a structured weekly plan with your pod, review progress, and keep challenging your previous milestone.",
  },
];

const saturdayTimeline = [
  { time: "08:45", label: "Arrive · greet · stretch" },
  { time: "09:00", label: "Warm-up · drills" },
  { time: "09:30", label: "Main set · focus blocks" },
  { time: "10:45", label: "Cool-down · debrief" },
  { time: "11:00", label: "Social · coffee · stories" },
];

// Re-imagined "What you get" — the 4 elements you flagged are preserved
// verbatim (titles + descriptions). Generic items from the old list
// (Everything in Community, Booking, Ride-Share, Progress Tracking) are
// folded into the richer sections elsewhere on the page.
const clubPerks = [
  {
    icon: Megaphone,
    title: "Exclusive Club Events",
    body: "Technique workshops, fun races, themed sessions, fitness days, etc.",
  },
  {
    icon: Trophy,
    title: "Eligibility for Internal Challenges & Awards",
    subItems: ["Time trials", "Monthly/seasonal challenges", "Progress & performance badges"],
  },
  {
    icon: Star,
    title: "Recognition System",
    body: "Earn and display titles like Best Freestyle, Most Improved, Distance King/Queen — visible on your public profile.",
  },
  {
    icon: Compass,
    title: "Participation in External Activities",
    body: "Access to triathlons, open water swims, swimming festivals, team relays, and partner events.",
  },
];

const sampleBadges = [
  { name: "Consistent 8", criteria: "Attend 8 sessions in a month" },
  { name: "Early Bird", criteria: "Arrive 15+ minutes early to 5 sessions" },
  { name: "Distance Swimmer", criteria: "Complete 2km in a single session" },
  {
    name: "Technique Master",
    criteria: "Demonstrate proficiency in all four strokes",
  },
];

const midweekItems = [
  {
    title: "Pod chat on WhatsApp",
    body: "Each pod has its own group chat. Quick check-ins, motivation, schedule changes.",
  },
  {
    title: "Solo → group conversion",
    body: "Going for a swim on a weekday? Post first. Two yeses and it counts as a pod swim toward your streak.",
  },
  {
    title: "Ride-share to Saturday",
    body: "Member-to-member coordination — passenger or driver — per session.",
  },
];

const notClub = [
  {
    title: "Not a coached programme",
    body: "That's Academy. Club is peer-led — your Pod Lead is an experienced member, not a paid instructor.",
  },
  {
    title: "Not casual one-offs",
    body: "That's Community. Club is a weekly commitment to your crew. Skipping Saturdays adds up — your streak knows.",
  },
  {
    title: "Not a quick win",
    body: "You'll feel meaningful change in 8–12 weeks. The ladders are there because real swim progress takes seasons, not sessions.",
  },
];

export default function ClubPage() {
  return (
    <div className="space-y-16 md:space-y-20">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Club Tier</p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
          Find your crew. Show up every Saturday.{" "}
          <span className="text-cyan-600">Get visibly better.</span>
        </h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Club is for swimmers who want a small, persistent training crew — a pod — and a weekly
          anchor session that compounds over months. Peer-led, accountable, progression-tracked.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            href="/register?goal=club"
            className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-cyan-500"
          >
            Join Club
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
          <Link
            href="/coach/apply?role=pod_lead"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Apply to be a Pod Lead
          </Link>
        </div>
        <p className="text-sm text-slate-600">
          Already a member?{" "}
          <Link href="/club/standards" className="font-semibold text-cyan-700 hover:text-cyan-600">
            Read the Club Standards →
          </Link>
        </p>
      </section>

      {/* ─── 4-STEP JOURNEY ──────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            How Club Works
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            From sign-up to streaks, four steps
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {journey.map((s) => (
            <Card key={s.step} className="space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-base font-bold text-cyan-700">
                {s.step}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-600">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── MEET THE PODS (live) ────────────────────────────────────── */}
      <MeetThePods />

      {/* ─── SATURDAY SESSION TIMELINE ───────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            The Saturday Anchor
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            What your Saturday looks like
          </h2>
          <p className="max-w-3xl text-slate-600">
            Same pool, same crew, every week. Three hours that anchor the rest of your training. Pod
            Leads can shift the day or time — but most pods land on a Saturday morning.
          </p>
        </div>
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {saturdayTimeline.map((t) => (
              <li key={t.time} className="flex items-center gap-4 p-4 sm:p-5">
                <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold tabular-nums text-slate-700">
                  {t.time}
                </div>
                <p className="text-sm text-slate-700 sm:text-base">{t.label}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* ─── SKILL LADDERS (live) ────────────────────────────────────── */}
      {/* Auto-renders any seeded skill ladders for the Club tier
          (challenges with series_slug set, audience='club'). Component
          itself returns null when no ladders exist — keeps the page
          clean before the first ladder is published. */}
      <SkillLaddersShowcase audience="club" />

      {/* ─── CLUB PERKS (preserved from the old page) ────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            What You Get
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Club perks</h2>
          <p className="max-w-3xl text-slate-600">
            Beyond your weekly pod session and skill ladder, Club unlocks events, awards,
            recognition, and access to partner activities you can't get at Community tier.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {clubPerks.map(({ icon: Icon, title, body, subItems }) => (
            <Card key={title} className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-base font-semibold text-slate-900 leading-tight">{title}</h3>
              </div>
              {body && <p className="text-sm text-slate-600">{body}</p>}
              {subItems && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {subItems.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* ─── SAMPLE BADGES (preserved) ───────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Recognition
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Sample Badges</h2>
          <p className="max-w-3xl text-slate-600">
            Push yourself and earn recognition for your commitment and achievements. Badges appear
            on your public profile alongside any skill-ladder progress.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sampleBadges.map((b) => (
            <Card key={b.name} className="flex items-start gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100">
                <span className="text-2xl">🏅</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{b.name}</h3>
                <p className="text-sm text-slate-600">{b.criteria}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── POD LEAD EXPLAINER ──────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Your Captain — Not a Coach
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">The Pod Lead role</h2>
        </div>
        <Card className="space-y-6 bg-gradient-to-br from-cyan-50/50 to-white">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">Who they are</h3>
              <p className="text-sm text-slate-600">
                An experienced Club member who knows the pool, the routine, and the people. Not a
                paid coach — a peer who's been showing up for longer than you have.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">What they do</h3>
              <p className="text-sm text-slate-600">
                Run the Saturday session: warm-up, main set, debrief. Keep the pod chat alive
                midweek. Welcome new members. Hold rhythm when motivation dips.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">Why it works</h3>
              <p className="text-sm text-slate-600">
                Peer accountability beats paid instruction for adult amateurs. Your Pod Lead has
                skin in the game — they're swimming alongside you, not standing on the deck.
              </p>
            </div>
          </div>
          <div className="border-t border-cyan-100 pt-4">
            <p className="text-sm text-slate-600">
              Think you'd be a great Pod Lead?{" "}
              <Link
                href="/coach/apply?role=pod_lead"
                className="font-semibold text-cyan-700 hover:text-cyan-800"
              >
                Apply to lead a pod →
              </Link>
            </p>
          </div>
        </Card>
      </section>

      {/* ─── MIDWEEK CULTURE (Phase 2) ───────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Beyond Saturday
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            How the pod stays connected midweek
          </h2>
          <p className="max-w-3xl text-slate-600">
            Saturdays are the anchor — but the pod doesn't go silent Monday to Friday. Here's how
            the culture works between sessions.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {midweekItems.map((m) => (
            <Card key={m.title} className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">{m.title}</h3>
              <p className="text-sm text-slate-600">{m.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── WHAT CLUB IS NOT (Phase 2) ──────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-600">
            Set Your Expectations
          </p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            What Club is <em>not</em>
          </h2>
          <p className="max-w-3xl text-slate-600">
            Being honest up-front saves everyone a difficult conversation later.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {notClub.map((n) => (
            <Card key={n.title} className="space-y-2 border-rose-100 bg-rose-50/30">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <h3 className="text-base font-semibold text-slate-900">{n.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{n.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Pricing</p>
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">What it costs</h2>
        </div>
        <Card className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-bold text-slate-900">From ₦60,000</span>
              <span className="text-sm text-slate-600">per quarter, location-dependent</span>
            </div>
            <p className="text-sm text-slate-600">
              Pool and refreshment costs differ by location. If you join mid-quarter with at least
              five sessions remaining, your Club price is adjusted by the sessions left. With four
              or fewer sessions, use Community drop-ins until the next quarter.
            </p>
          </div>
          <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Annual SwimBuddz Membership</p>
              <p className="text-2xl font-bold text-slate-900">₦20,000</p>
              <p className="text-xs text-slate-600">Added only when due, in the same checkout.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">Community Experience</p>
              <p className="text-2xl font-bold text-slate-900">₦30,000</p>
              <p className="text-xs text-slate-600">
                Optional and selected by default for the current quarter. It is ₦40,000 for an
                active Club member buying later and ₦50,000 at the standard member rate.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            You can add future Club quarters in the same checkout; future quarters start unselected.
            Each quarter creates its own entitlement and receipt line.
          </p>
        </Card>
      </section>

      {/* ─── DUAL CTA ───────────────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 bg-gradient-to-br from-cyan-600 to-cyan-700 p-8 text-white">
          <Users className="h-8 w-8" />
          <h2 className="text-xl font-bold">Join Club</h2>
          <p className="text-sm text-cyan-50">
            Pick a pod, lock in your Saturday, and start your streak.
          </p>
          <Link
            href="/register?goal=club"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
          >
            Join Club Tier
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card className="space-y-4 border-slate-900 bg-slate-900 p-8 text-white">
          <Trophy className="h-8 w-8 text-amber-400" />
          <h2 className="text-xl font-bold">Lead a Pod</h2>
          <p className="text-sm text-slate-300">
            Already swim consistently? Help others build the habit. Pod Leads get free or discounted
            membership while they lead.
          </p>
          <Link
            href="/coach/apply?role=pod_lead"
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Apply to be a Pod Lead
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      {/* ─── SESSIONS LINK ──────────────────────────────────────────── */}
      <section className="space-y-2 text-center">
        <p className="text-sm text-slate-500">
          Want to peek at what's running first?{" "}
          <Link
            href="/sessions-and-events"
            className="font-semibold text-cyan-600 hover:text-cyan-700"
          >
            See the upcoming sessions schedule →
          </Link>
        </p>
      </section>

      {/* ─── CLOSING POSITIONING ────────────────────────────────────── */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-12 text-center text-white">
        <h2 className="text-3xl font-bold">Who is this for?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-200">
          Anyone who wants to swim regularly, get better, belong to a training crew, and track
          progress month-by-month. Lagos-based right now, more cities soon.
        </p>
      </section>
    </div>
  );
}
