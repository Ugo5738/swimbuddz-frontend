"use client";

import { Card } from "@/components/ui/Card";
import {
  RECOGNITION_LABELS,
  VolunteersApi,
  type SpotlightData,
} from "@/lib/volunteers";
import Link from "next/link";
import { useEffect, useState } from "react";

const communityFeatures = [
  {
    title: "Meet Our Coaches",
    description:
      "Discover our certified swimming coaches, their expertise, and the programs they teach.",
    link: "/coaches",
  },
  {
    title: "Events Calendar",
    description:
      "Enjoy occasional social swims, casual meetups, beach hangouts, socials, watch parties and community-led activities.",
    link: "/community/events",
  },
  {
    title: "Member Directory",
    description:
      "Connect with other swimmers who opted in to be visible in the community.",
    link: "/community/directory",
  },
  {
    title: "Volunteer Hub",
    description:
      "Help build SwimBuddz by volunteering in media, logistics, or coaching support.",
    link: "/community/volunteers",
  },
  {
    title: "Tips & Articles",
    description:
      "Educational content on swimming techniques, safety, breathing, and more.",
    link: "/community/tips",
  },
];

const benefits = [
  "Access to the Community Network",
  "Access to Community Events (Social swims, casual meetups, beach hangouts)",
  "Basic Member Profile",
  "Access to Community Chats (General conversation, Q&A)",
  "Educational Content (Swim tips, technique guides, lifestyle/fitness)",
  "Opt-in Features (Volunteer roles and opportunities)",
];

export default function CommunityPage() {
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);

  useEffect(() => {
    VolunteersApi.getSpotlight()
      .then(setSpotlight)
      .catch(() => {
        /* spotlight is supplementary — don't break page */
      });
  }, []);

  const hasSpotlightContent =
    spotlight &&
    (spotlight.total_active_volunteers > 0 ||
      spotlight.featured_volunteer ||
      spotlight.total_hours_all_time > 0);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Community Tier
        </p>
        <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
          Access to the Community Network
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          Designed for people who simply want to be part of the SwimBuddz
          family. A welcoming space to connect with swimmers from around the
          world.
        </p>
      </section>

      {/* Benefits Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">What You Get</h2>
        <Card className="space-y-4">
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs text-cyan-700">
                  ✓
                </span>
                <span className="text-slate-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Community Features Grid */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Explore Community Features
          </h2>
          <p className="text-base text-slate-600 mt-2">
            Jump into the different areas of the SwimBuddz community.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {communityFeatures.map((feature) => (
            <Card key={feature.title} className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600">{feature.description}</p>
              <Link
                href={feature.link}
                className="inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-600"
              >
                Explore →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Volunteer Spotlight */}
      {hasSpotlightContent && (
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
              Volunteer with us
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 mt-1">
              Our Volunteers Make It Happen
            </h2>
            <p className="text-base text-slate-600 mt-2">
              SwimBuddz runs on the generosity of community members who give
              their time.
            </p>
          </div>

          {/* Aggregate Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Card className="text-center py-6">
              <p className="text-3xl font-bold text-cyan-600">
                {spotlight!.total_active_volunteers}
              </p>
              <p className="text-sm text-slate-600 mt-1">Active Volunteers</p>
            </Card>
            <Card className="text-center py-6">
              <p className="text-3xl font-bold text-cyan-600">
                {Math.floor(spotlight!.total_hours_all_time)}+
              </p>
              <p className="text-sm text-slate-600 mt-1">Hours Logged</p>
            </Card>
            <Card className="text-center py-6 col-span-2 md:col-span-1">
              <p className="text-3xl font-bold text-cyan-600">
                {spotlight!.top_volunteers.length}
              </p>
              <p className="text-sm text-slate-600 mt-1">Top Contributors</p>
            </Card>
          </div>

          {/* Milestones */}
          {spotlight!.milestones_this_month.length > 0 && (
            <div className="space-y-2">
              {spotlight!.milestones_this_month.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3"
                >
                  <span className="text-lg">🏅</span>
                  <span className="text-sm text-amber-800">
                    {m.description} this month
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Featured Volunteer */}
          {spotlight!.featured_volunteer && (
            <Card className="bg-gradient-to-br from-cyan-50 to-slate-50 border-cyan-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⭐</span>
                <h3 className="font-semibold text-cyan-800">
                  Volunteer of the Month
                </h3>
              </div>
              <div className="flex items-start gap-4">
                {spotlight!.featured_volunteer.profile_photo_url ? (
                  <img
                    src={spotlight!.featured_volunteer.profile_photo_url}
                    alt={spotlight!.featured_volunteer.member_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-white shadow"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-cyan-200 flex items-center justify-center text-2xl text-cyan-700 border-2 border-white shadow flex-shrink-0">
                    {spotlight!.featured_volunteer.member_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">
                    {spotlight!.featured_volunteer.member_name}
                  </p>
                  {spotlight!.featured_volunteer.recognition_tier && (
                    <p className="text-xs text-slate-500">
                      {
                        RECOGNITION_LABELS[
                          spotlight!.featured_volunteer.recognition_tier
                        ]
                      }
                    </p>
                  )}
                  <p className="text-sm text-slate-600 mt-1">
                    {spotlight!.featured_volunteer.total_hours.toFixed(0)} hours
                    volunteered
                  </p>
                  {spotlight!.featured_volunteer.spotlight_quote && (
                    <blockquote className="mt-2 border-l-2 border-cyan-300 pl-3 text-sm italic text-slate-600">
                      &ldquo;{spotlight!.featured_volunteer.spotlight_quote}
                      &rdquo;
                    </blockquote>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/community/volunteers"
              className="inline-block rounded-full bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition"
            >
              Explore Volunteer Roles
            </Link>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Who is this for?</h2>
        <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
          Anyone who wants to join the movement, make friends, and participate
          casually—no commitments or training expectations.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
        >
          Join SwimBuddz
        </Link>
      </section>

      {/* Next Steps */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Want More?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="text-lg font-semibold text-cyan-700">Club Tier</h3>
            <p className="text-sm text-slate-600">
              Join structured training sessions, track your attendance, and
              build consistency.
            </p>
            <Link
              href="/club"
              className="inline-flex text-sm font-semibold text-cyan-700 hover:underline"
            >
              Learn about Club →
            </Link>
          </Card>
          <Card className="space-y-2">
            <h3 className="text-lg font-semibold text-cyan-700">
              Academy Tier
            </h3>
            <p className="text-sm text-slate-600">
              Enroll in structured learning programs with clear milestones and
              coach feedback.
            </p>
            <Link
              href="/academy"
              className="inline-flex text-sm font-semibold text-cyan-700 hover:underline"
            >
              Learn about Academy →
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
