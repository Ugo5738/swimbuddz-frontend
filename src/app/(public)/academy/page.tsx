import { AcademyStats } from "@/components/academy/AcademyStats";
import { CoachSpotlight } from "@/components/academy/CoachSpotlight";
import { LiveTestimonials } from "@/components/academy/LiveTestimonials";
import { UpcomingCohorts } from "@/components/academy/UpcomingCohorts";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

// Persona chips jump to the matching pathway card further down the page.
const personas = [
  { label: "New to swimming", anchor: "#pathway-beginner", tone: "cyan" },
  {
    label: "Can swim, want to improve",
    anchor: "#pathway-intermediate",
    tone: "indigo",
  },
  {
    label: "Racing / open water",
    anchor: "#pathway-advanced",
    tone: "emerald",
  },
] as const;

const personaToneClasses: Record<(typeof personas)[number]["tone"], string> = {
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-400",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:border-indigo-400",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400",
};

// ── Benefits, grouped for visual hierarchy ─────────────────────────
type Benefit = {
  title: string;
  description?: string;
  subItems?: string[];
};

type BenefitGroup = {
  title: string;
  subtitle: string;
  items: Benefit[];
};

const benefitGroups: BenefitGroup[] = [
  {
    title: "Curriculum & Structure",
    subtitle: "A clear path from where you are to where you want to be.",
    items: [
      {
        title: "Structured Curriculum & Milestones",
        description:
          "Water comfort → floating → breathing → kick → arm movement → full stroke → endurance → efficiency.",
      },
      {
        title: "Cohort-Based Scheduling",
        description:
          "4+ week programs with classmates who start and graduate together — built around real work schedules.",
      },
      {
        title: "Coach-Assigned Drills & Goals",
        description:
          "Personalized tasks to complete between sessions so progress compounds week over week.",
      },
    ],
  },
  {
    title: "Progress & Feedback",
    subtitle: "Know exactly how you're improving.",
    items: [
      {
        title: "Detailed Progress Tracking",
        subItems: [
          "Milestone tracking with dates of completion",
          "Skill gap analysis",
          "Stroke-by-stroke progress view",
        ],
      },
      {
        title: "Coach Notes & Feedback History",
        description:
          "A dedicated performance journal on your profile — no more guessing what you worked on last month.",
      },
      {
        title: "Video Analysis (Optional)",
        description:
          "Coaches review your technique and send annotated feedback you can review on your phone.",
      },
    ],
  },
  {
    title: "Recognition & Perks",
    subtitle: "Tangible outcomes you can point to.",
    items: [
      {
        title: "Certification & Level Badge",
        description: "Finish a cohort with a certificate and badge showing your achieved level.",
      },
      {
        title: "Premium Resources",
        description:
          "Exclusive drills library, progression charts, and bonus academy-only sessions.",
      },
      {
        title: "Priority Booking",
        description: "First access to limited-seat workshops and specialty sessions.",
      },
    ],
  },
];

const learningPaths = [
  {
    anchorId: "pathway-beginner",
    title: "Beginner Pathway",
    tagline: "Starting from scratch, or restarting after a long break.",
    description:
      "Build water confidence, breathing control, and your first real stroke — no rushing, no shame.",
    milestones: [
      "Water confidence",
      "Floating & breathing control",
      "Basic kick & body position",
      "Freestyle fundamentals",
    ],
  },
  {
    anchorId: "pathway-intermediate",
    title: "Intermediate Pathway",
    tagline: "You can swim, but you'd like to swim better.",
    description: "Refine all four strokes, build endurance, and add flip turns and pacing.",
    milestones: ["All four strokes", "Endurance building", "Flip turns", "Technique refinement"],
  },
  {
    anchorId: "pathway-advanced",
    title: "Advanced Pathway",
    tagline: "You want to race, compete, or swim open water.",
    description: "Open water skills, race strategy, and competition-ready conditioning.",
    milestones: [
      "Open water skills",
      "Race strategy & pacing",
      "Advanced drills",
      "Competition ready",
    ],
  },
];

const cohortStructure = [
  {
    title: "Small Groups",
    description: "6–12 swimmers per cohort for personalized coach attention.",
    icon: "👥",
  },
  {
    title: "Fixed Schedule",
    description: "Set weekly times you can plan your calendar around.",
    icon: "🗓️",
  },
  {
    title: "Clear Milestones",
    description: "You know exactly what you're working toward each week.",
    icon: "🎯",
  },
  {
    title: "Coach Feedback",
    description: "Regular check-ins and progress assessments in-app.",
    icon: "💬",
  },
];

const journeySteps = [
  {
    step: "1",
    title: "Reserve your spot",
    description:
      "Pick a cohort and hold your seat. Pay now or pay in installments if enabled for that cohort.",
    accent: "bg-cyan-50 border-cyan-200 text-cyan-700",
  },
  {
    step: "2",
    title: "Pre-cohort prep (weeks before you start)",
    description:
      "We'll send you an orientation, a gear checklist, your coach intro, and a simple at-home routine so you arrive ready.",
    accent: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    step: "3",
    title: "Cohort begins",
    description: "First session, baseline assessment, and your milestone plan for the weeks ahead.",
    accent: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
];

// Typical 8-week cohort curriculum phases (static, representative)
const curriculumPhases = [
  {
    phase: "Weeks 1–2",
    title: "Foundation",
    focus: "Water comfort, breathing, body position",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    phase: "Weeks 3–4",
    title: "Mechanics",
    focus: "Kick, arm movement, balance",
    color: "from-sky-500 to-sky-600",
  },
  {
    phase: "Weeks 5–6",
    title: "Integration",
    focus: "Full stroke, breathing rhythm, drills",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    phase: "Weeks 7–8",
    title: "Endurance & Assessment",
    focus: "Distance, efficiency, final evaluation",
    color: "from-emerald-500 to-emerald-600",
  },
];

export default function AcademyPage() {
  return (
    <div className="space-y-14">
      {/* ─── 1. HERO ────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Academy Tier
        </p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl leading-tight">
          Learn to swim properly — with a plan that actually fits your week.
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          A structured, cohort-based program built around real technique, measurable progress, and a
          certificate at the end — not another open-ended membership.
        </p>

        {/* Stats chips */}
        <div className="pt-2">
          <AcademyStats />
        </div>

        {/* Persona chips — jump to matching pathway */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Where are you starting from?
          </p>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => (
              <a
                key={p.anchor}
                href={p.anchor}
                className={`inline-block rounded-full border px-4 py-2 text-sm font-medium transition ${personaToneClasses[p.tone]}`}
              >
                {p.label} →
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="#upcoming-cohorts"
            className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
          >
            See next cohort →
          </a>
          <a
            href="#how-it-works"
            className="inline-block rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition"
          >
            How it works
          </a>
        </div>
      </section>

      {/* ─── 2. UPCOMING COHORTS ────────────────────────────────────── */}
      <section id="upcoming-cohorts" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Upcoming Cohorts</h2>
            <p className="text-slate-600 mt-2">
              Reserve your spot now — cohort prep materials start arriving as soon as you enroll.
            </p>
          </div>
          <Link
            href="/academy/programs"
            className="text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-1"
          >
            View all programs <span aria-hidden="true">→</span>
          </Link>
        </div>
        <UpcomingCohorts />
      </section>

      {/* ─── 3. PRE-COHORT JOURNEY ──────────────────────────────────── */}
      <section id="how-it-works" className="space-y-6 scroll-mt-24">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">What happens after you reserve</h2>
          <p className="text-base text-slate-600 mt-2">
            You don&apos;t sit and wait. The program starts working for you the day you enroll.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {journeySteps.map((step) => (
            <Card key={step.step} className="space-y-3">
              <div
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${step.accent}`}
              >
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 4. CURRICULUM TIMELINE ─────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            What a typical 8-week cohort looks like
          </h2>
          <p className="text-base text-slate-600 mt-2">
            Concrete milestones, week by week. (Duration varies by program.)
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Horizontal line */}
          <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-200 via-indigo-200 to-emerald-200" />

          <div className="grid gap-6 md:grid-cols-4 relative">
            {curriculumPhases.map((phase, idx) => (
              <div key={phase.phase} className="space-y-3">
                {/* Node */}
                <div className="flex items-center gap-3 md:flex-col md:items-start">
                  <div
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${phase.color} flex items-center justify-center text-white font-bold shadow-md relative z-10`}
                  >
                    {idx + 1}
                  </div>
                  <div className="md:mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {phase.phase}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">{phase.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-slate-600 md:pl-0">{phase.focus}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. WHAT YOU GET (grouped) ──────────────────────────────── */}
      <section className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">What You Get</h2>
          <p className="text-base text-slate-600 mt-2">
            Everything a committed learner needs to actually finish.
          </p>
        </div>
        <div className="space-y-10">
          {benefitGroups.map((group) => (
            <div key={group.title} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                <p className="text-sm text-slate-500">{group.subtitle}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {group.items.map((item) => (
                  <Card key={item.title} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm text-cyan-700">
                        ✓
                      </span>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-slate-900 leading-tight">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {item.subItems && (
                          <ul className="list-disc pl-4 space-y-1 text-sm text-slate-600">
                            {item.subItems.map((sub) => (
                              <li key={sub}>{sub}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 6. LEARNING PATHWAYS ───────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Learning Pathways</h2>
          <p className="text-base text-slate-600 mt-2">
            Pick the path that matches where you actually are today.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {learningPaths.map((path) => (
            <Card key={path.title} id={path.anchorId} className="space-y-3 scroll-mt-24">
              <h3 className="text-lg font-semibold text-cyan-700">{path.title}</h3>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {path.tagline}
              </p>
              <p className="text-sm text-slate-600">{path.description}</p>
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Key Milestones
                </p>
                <ul className="space-y-1">
                  {path.milestones.map((milestone) => (
                    <li key={milestone} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="text-cyan-600">•</span>
                      {milestone}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 7. COHORT STRUCTURE ────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">How Cohorts Work</h2>
          <p className="text-base text-slate-600 mt-2">
            Small groups, structured around your calendar.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cohortStructure.map((item) => (
            <Card key={item.title} className="space-y-2">
              <div className="text-2xl">{item.icon}</div>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── 8. COACH SPOTLIGHT ─────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
              Meet Your Coaches
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 mt-1">
              Certified coaches who teach like teachers, not drill sergeants.
            </h2>
          </div>
          <Link
            href="/coaches"
            className="text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-1 text-sm"
          >
            Browse all coaches <span aria-hidden="true">→</span>
          </Link>
        </div>
        <CoachSpotlight />
      </section>

      {/* ─── 8b. TESTIMONIALS (live from backend, static fallback) ──── */}
      <LiveTestimonials track="academy" />

      {/* ─── 9. GRADUATES & TESTIMONIALS (honest empty state) ───────── */}
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
            Graduate Wall
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 mt-1">
            Swimmers who finished what they started.
          </h2>
        </div>
        <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="text-4xl mb-3">🏅</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            This space is reserved for our graduates.
          </h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Every swimmer who completes a cohort gets a certificate, a badge, and a spot on this
            wall. Be one of the first to fill it.
          </p>
          <div className="mt-5">
            <a
              href="#upcoming-cohorts"
              className="inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition"
            >
              Reserve your spot →
            </a>
          </div>
        </Card>
      </section>

      {/* ─── 10. CTA ────────────────────────────────────────────────── */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100 mb-3">
          Who this is for
        </p>
        <h2 className="text-3xl font-bold mb-4">People who want something concrete to finish.</h2>
        <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
          Whether you&apos;re learning from scratch or finally fixing your stroke — this is for
          anyone who wants structure, a clear endpoint, and a certificate to show for it.
        </p>
        <a
          href="#upcoming-cohorts"
          className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
        >
          Reserve your spot
        </a>
      </section>
    </div>
  );
}
