"use client";

import { Card } from "@/components/ui/Card";
import type {
  AcademyProgressSection,
  ConsistencyCommunitySection,
} from "@/lib/scorecard";
import {
  ArrowRight,
  Award,
  Calendar,
  Car,
  Clock,
  Flame,
  GraduationCap,
  Heart,
} from "lucide-react";
import Link from "next/link";

type Props = {
  academy: AcademyProgressSection;
  consistency: ConsistencyCommunitySection;
  showReportsLink?: boolean;
};

export function ConsistencyCommunityStrip({
  academy,
  consistency,
  showReportsLink = true,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Consistency & Community Strip */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Consistency &amp; Community
            </h3>
            <p className="text-xs text-slate-500">
              Lifetime rhythm from your SwimBuddz sessions &amp; community footprint
            </p>
          </div>
          {showReportsLink && (
            <Link
              href="/account/reports"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Quarterly Reports
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {!consistency.available && !consistency.volunteer_available ? (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Activity totals are temporarily unavailable — check back shortly or open{" "}
            <Link href="/account/reports" className="font-semibold text-cyan-700 underline">
              Swim Reports
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-cyan-600" />
                Verified Swims
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {consistency.available ? consistency.total_sessions_attended : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Pool Hours
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {consistency.available ? `${consistency.total_pool_hours.toFixed(1)}h` : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                Best Streak
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {consistency.available ? `${consistency.longest_streak_weeks}w` : "—"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                Volunteer Hours
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {consistency.volunteer_available || consistency.available
                  ? `${consistency.volunteer_hours.toFixed(1)}h`
                  : "—"}
              </p>
              {consistency.volunteer_recognition_tier && (
                <p className="text-[11px] font-medium capitalize text-rose-600">
                  {consistency.volunteer_recognition_tier.replace(/_/g, " ")}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Car className="h-3.5 w-3.5 text-indigo-600" />
                Rides Shared
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {consistency.available ? consistency.rides_shared : "—"}
              </p>
            </div>

            {consistency.punctuality_rate !== null && (
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Award className="h-3.5 w-3.5 text-emerald-600" />
                  Punctuality
                </div>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {Math.round(consistency.punctuality_rate * 100)}%
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Academy Milestones & Credentials Strip */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-600" />
              Academy Milestones
            </h3>
            <p className="text-xs text-slate-500">
              Verified competencies &amp; cohort credentials carried into your Swim Passport
            </p>
          </div>
          {showReportsLink && (
            <Link
              href="/account/academy"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Academy
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {!academy.available ? (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Academy summary is currently unavailable.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-purple-50/70 p-3">
                <p className="text-xs text-purple-700">Achieved</p>
                <p className="mt-1 text-lg font-bold text-purple-950">
                  {academy.milestones_achieved}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">In Progress</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {academy.milestones_in_progress}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/70 p-3">
                <p className="text-xs text-emerald-700">Certificates</p>
                <p className="mt-1 text-lg font-bold text-emerald-950">
                  {academy.certificates_earned}
                </p>
              </div>
            </div>

            {academy.recent_milestones.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recent Verified Milestones
                </p>
                <ul className="space-y-1.5">
                  {academy.recent_milestones.slice(0, 4).map((m, idx) => (
                    <li
                      key={`${m.milestone_name}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-800">
                        {m.milestone_name}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {m.achieved_at
                          ? new Date(m.achieved_at).toLocaleDateString("en-NG", {
                              month: "short",
                              year: "numeric",
                            })
                          : m.program_name ?? "Verified"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No Academy cohort milestones recorded yet. Milestones earned in any Academy cohort sync here automatically.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
