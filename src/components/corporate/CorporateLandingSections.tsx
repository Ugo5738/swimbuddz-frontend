// Server-rendered marketing sections for /corporate.
//
// Content mirrors the outward-facing pitch in
// docs/marketing/CORPORATE_WELLNESS.md. Keep this file aligned with that
// doc — when the playbook changes, this page should change too.

import {
  Activity,
  Briefcase,
  Calendar,
  CheckCircle2,
  Heart,
  Home,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";

import { Card } from "@/components/ui/Card";

const employeeBenefits = [
  "12-week structured swim cohort, beginner-friendly",
  "Saturday mornings, 90-minute sessions, Lagos partner pool",
  "Trauma-informed coaching — designed for adults who never learned",
  "Distance-based milestones, structured curriculum, community of peers",
  "WhatsApp group, milestone certificates, post-program Club access",
  "A skill that lasts a lifetime — and doesn't require daily discipline",
];

const whySwimming = [
  {
    icon: ShieldCheck,
    title: "Zero impact",
    body: "Lower injury rate than gym, accessible to all body types.",
  },
  {
    icon: Heart,
    title: "Real recovery",
    body: "Water is regulating; cortisol drops measurably during swim.",
  },
  {
    icon: Sparkles,
    title: "Lifelong skill",
    body: "Once learned, never forgotten — unlike a new gym routine.",
  },
  {
    icon: Users,
    title: "Community-driven",
    body: "Group format builds bonds your team retreats can't.",
  },
];

const rippleSections = [
  {
    icon: Briefcase,
    title: "At work",
    bullets: [
      "Stress regulation that lasts beyond Saturday",
      "Cohesion across departments — cohort friendships outlast team retreats",
      "Internal storytelling: completion rates, testimonials, photo content HR can use",
      "Sleep, energy, and presence — regular swimmers report steadier weekday energy",
    ],
  },
  {
    icon: Home,
    title: "At home",
    bullets: [
      "Employees teach their kids — one trained adult raises a generation that swims",
      "Real water safety in a city surrounded by water",
      "Shared family activity — weekends that don't revolve around screens",
      "A quiet anxiety, finally resolved",
    ],
  },
  {
    icon: Activity,
    title: "For life",
    bullets: [
      "Vacation confidence — beaches and hotel pools become destinations, not stressors",
      "Mental health regulation — repetitive, low-impact, sensory-rich",
      "Exercise that ages with you — joints intact past 60",
      "A hobby that grows — open water, masters meets, coaching others",
    ],
  },
];

const pricingTiers = [
  {
    label: "1–4 employees",
    per: "₦150,000",
    note: "Full price",
    total: "—",
    highlight: false,
  },
  {
    label: "5–9 employees",
    per: "₦135,000",
    note: "10% off · Recommended pilot size",
    total: "₦675k – ₦1.215M",
    highlight: true,
  },
  {
    label: "10+ employees",
    per: "₦127,500",
    note: "15% off",
    total: "₦1.275M+",
    highlight: false,
  },
];

const logistics = [
  { icon: Calendar, label: "Cohort schedule", body: "New cohorts every 8-12 weeks" },
  { icon: Waves, label: "Location", body: "Lagos partner pools — confirmed per cohort" },
  {
    icon: CheckCircle2,
    label: "Time commitment",
    body: "90-120 mins/week, Saturday mornings",
  },
  {
    icon: ShieldCheck,
    label: "Privacy",
    body: "Health-relevant data stays with the coach — never shared with the employer",
  },
];

const outcomes = [
  { label: "Attendance rate target", value: ">85%" },
  { label: "Completion rate target", value: ">75% reach 50m freestyle" },
  { label: "Wellness improvement", value: "Pre/post survey" },
  { label: "Employer assets", value: "Photo / video for internal comms" },
];

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-sky-50 via-white to-sky-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">
          SwimBuddz Corporate Wellness
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          The wellness benefit your team will actually finish.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-700">
          Most wellness budgets pay for things nobody uses past March. Our
          12-week adult swim program gets used, finished, and remembered —
          built for the quiet majority of Lagos professionals who never
          learned to swim, or learned badly as kids and gave up.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#intake"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
          >
            Request a 20-min intro call
          </a>
          <a
            href="#pricing"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            See pricing
          </a>
        </div>
      </div>
    </section>
  );
}

export function WhatEmployeesGetSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        What your employees get
      </h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {employeeBenefits.map((line) => (
          <div key={line} className="flex items-start gap-3 text-slate-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-sky-600" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WhySwimmingSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Why swimming, specifically
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {whySwimming.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <Icon className="h-6 w-6 text-sky-600" />
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RippleSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        More than a wellness benefit
      </h2>
      <p className="mt-3 max-w-3xl text-slate-700">
        Once an employee learns to swim, the skill ripples outward — into
        their family, their weekends, and the next thirty years of their life.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {rippleSections.map(({ icon: Icon, title, bullets }) => (
          <Card key={title}>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-sky-600" />
              <h3 className="font-semibold text-slate-900">{title}</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-sky-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pricing
        </h2>
        <p className="mt-2 text-slate-700">
          Per employee for the full 12-week program. No setup fees.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.label}
              className={
                tier.highlight ? "ring-2 ring-sky-500" : undefined
              }
            >
              <p className="text-sm font-medium text-slate-600">{tier.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{tier.per}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-sky-700">
                {tier.note}
              </p>
              <p className="mt-3 text-sm text-slate-600">Total: {tier.total}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-sky-200 bg-sky-50 p-6">
          <h3 className="font-semibold text-sky-900">Pilot offer (limited)</h3>
          <p className="mt-1 text-sm text-sky-900">
            The first 5 corporate partners get a pilot package: no setup or
            admin fees, one free intro session for ≥10 staff, outcome reports
            at week 6 and week 12, and optional employer co-branding on
            graduation certificates.
          </p>
        </div>
      </div>
    </section>
  );
}

export function LogisticsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Logistics
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {logistics.map(({ icon: Icon, label, body }) => (
          <Card key={label}>
            <Icon className="h-5 w-5 text-sky-600" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-sm text-slate-700">{body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function OutcomesSection() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Outcomes you can measure
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map(({ label, value }) => (
            <Card key={label}>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {value}
              </p>
            </Card>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-sm text-slate-600">
          At week 6 and again at week 12, your HR contact gets a SwimBuddz
          Wrapped report: attendance, milestone completion, employee
          testimonials — useful for internal wellness storytelling.
        </p>
      </div>
    </section>
  );
}
