"use client";

import { Card } from "@/components/ui/Card";
import {
  CATEGORY_LABELS,
  VolunteersApi,
  type SpotlightData,
  type VolunteerRoleCategory,
} from "@/lib/volunteers";
import Link from "next/link";
import { useEffect, useState } from "react";

// 4 broad public-facing volunteer categories
const volunteerCategories = [
  {
    icon: "🏊",
    title: "Session Support",
    description:
      "Keep swim sessions running smoothly — from warm-ups to lane coordination and safety.",
    roles: ["Session Lead", "Lane Marshal", "Check-in", "Safety Rep", "Warm-up Lead"],
  },
  {
    icon: "📸",
    title: "Media & Content",
    description:
      "Capture the SwimBuddz experience through photography, video, and gallery curation.",
    roles: ["Media Volunteer", "Gallery Support"],
  },
  {
    icon: "🤝",
    title: "Community",
    description: "Welcome newcomers, mentor nervous swimmers, and help members get to sessions.",
    roles: ["Welcome Volunteer", "Mentor / Buddy", "Ride Share Driver"],
  },
  {
    icon: "📋",
    title: "Events & Logistics",
    description: "Organise special events, plan trips, and support academy coaching sessions.",
    roles: ["Events Volunteer", "Trip Planner", "Academy Assistant"],
  },
];

const recognitionTiers = [
  {
    level: "Bronze",
    hours: "10+",
    perk: "Priority access to community events",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "🥉",
  },
  {
    level: "Silver",
    hours: "50+",
    perk: "20% discount on session fees",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: "🥈",
  },
  {
    level: "Gold",
    hours: "100+",
    perk: "50% discount on membership fees",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "🥇",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Sign Up",
    description:
      "Create a SwimBuddz account and indicate your volunteer interests during registration.",
  },
  {
    step: "2",
    title: "Get Matched",
    description:
      "Browse available volunteer opportunities and claim the ones that fit your schedule.",
  },
  {
    step: "3",
    title: "Show Up",
    description:
      "Volunteer at sessions and events. Log your hours, earn recognition, and unlock perks.",
  },
];

/** Guard against UUIDs or missing names showing in the UI */
function getDisplayName(name: string | null | undefined): string {
  if (!name) return "Volunteer";
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name)) return "Volunteer";
  return name;
}

export default function PublicVolunteerPage() {
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSpotlight = async () => {
      try {
        const data = await VolunteersApi.getSpotlight();
        setSpotlight(data);
      } catch (error) {
        console.error("Failed to fetch volunteer spotlight:", error);
      }
    };
    fetchSpotlight();
  }, []);

  // Fetch volunteer role names so we can resolve UUIDs → titles
  useEffect(() => {
    VolunteersApi.listRoles()
      .then((roles) => {
        const map: Record<string, string> = {};
        roles.forEach((r) => {
          map[r.id] = r.title;
        });
        setRoleMap(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-20 py-8">
      {/* Hero */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Join the Movement
        </p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
          Help Build the SwimBuddz Community
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          SwimBuddz runs on purpose. Our volunteers are the reason sessions happen, newcomers feel
          welcome, and the community keeps growing. When you volunteer, you&apos;re not filling a
          shift — you&apos;re joining a movement.
        </p>
      </section>

      {/* Impact stats */}
      {spotlight && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6 text-center bg-gradient-to-br from-cyan-50 to-white">
            <p className="text-4xl font-bold text-cyan-700">
              {spotlight.total_hours_all_time || 0}+
            </p>
            <p className="text-sm text-slate-600 mt-1">Volunteer Hours Contributed</p>
          </Card>
          <Card className="p-6 text-center bg-gradient-to-br from-cyan-50 to-white">
            <p className="text-4xl font-bold text-cyan-700">
              {spotlight.total_active_volunteers || 0}
            </p>
            <p className="text-sm text-slate-600 mt-1">Active Volunteers</p>
          </Card>
          <Card className="p-6 text-center bg-gradient-to-br from-cyan-50 to-white">
            <p className="text-4xl font-bold text-cyan-700">13</p>
            <p className="text-sm text-slate-600 mt-1">Volunteer Roles Available</p>
          </Card>
        </section>
      )}

      {/* Volunteer of the Month */}
      {spotlight?.featured_volunteer && (
        <section className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
              Volunteer of the Month
            </p>
          </div>
          <Card className="max-w-2xl mx-auto border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
            <div className="p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="absolute -top-2 -right-2 text-2xl">🏆</div>
                {spotlight.featured_volunteer.profile_photo_url ? (
                  <img
                    src={spotlight.featured_volunteer.profile_photo_url}
                    alt={getDisplayName(spotlight.featured_volunteer.member_name)}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-amber-200">
                    {getDisplayName(spotlight.featured_volunteer.member_name)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {getDisplayName(spotlight.featured_volunteer.member_name)}
                </h3>
                {(() => {
                  const roleId = spotlight.featured_volunteer.preferred_roles?.[0];
                  if (!roleId) return null;
                  const label = roleMap[roleId] || CATEGORY_LABELS[roleId as VolunteerRoleCategory];
                  if (!label) return null;
                  return <p className="text-sm text-amber-700 font-medium">{label}</p>;
                })()}
                <p className="text-sm text-slate-500">
                  {spotlight.featured_volunteer.total_hours} hours contributed
                  {spotlight.featured_volunteer.recognition_tier &&
                    ` • ${spotlight.featured_volunteer.recognition_tier.charAt(0).toUpperCase() + spotlight.featured_volunteer.recognition_tier.slice(1)} tier`}
                </p>
                {spotlight.featured_volunteer.spotlight_quote && (
                  <p className="text-slate-600 italic mt-3">
                    &quot;{spotlight.featured_volunteer.spotlight_quote}&quot;
                  </p>
                )}
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* How Volunteering Works */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Simple Process
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">How Volunteering Works</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {howItWorks.map((step) => (
            <div key={step.step} className="text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/25 mx-auto">
                {step.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Volunteer Categories */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Find Your Fit
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">Ways to Volunteer</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose from 4 broad areas. Each has specific roles you can explore once you join.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {volunteerCategories.map((category) => (
            <Card key={category.title} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-4">
                <div className="text-4xl flex-shrink-0">{category.icon}</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">{category.title}</h3>
                  <p className="text-sm text-slate-600">{category.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {category.roles.map((role) => (
                      <span
                        key={role}
                        className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Recognition Tiers */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-600">
            Recognition
          </p>
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Your Effort Gets Recognised
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            The more you show up, the more perks you unlock. No minimum commitments — volunteer at
            your own pace.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {recognitionTiers.map((tier) => (
            <Card key={tier.level} className={`p-6 text-center border-2 ${tier.color}`}>
              <div className="text-4xl mb-3">{tier.icon}</div>
              <h3 className="text-xl font-bold">{tier.level}</h3>
              <p className="text-2xl font-bold mt-1">{tier.hours} hours</p>
              <p className="text-sm mt-3">{tier.perk}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 text-center text-white shadow-2xl md:px-12 md:py-20">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to Make a Difference?</h2>
          <p className="text-lg text-slate-300">
            Join SwimBuddz and indicate your volunteer interests. We&apos;ll match you with
            opportunities that fit your schedule and skills.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/25"
            >
              Indicate Your Interest
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
