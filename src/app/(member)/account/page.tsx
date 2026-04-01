"use client";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { GreetingHero } from "@/components/dashboard/GreetingHero";
import { NextSessionCard } from "@/components/dashboard/NextSessionCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SwimCalendar } from "@/components/dashboard/SwimCalendar";
import { YTDStatsOverview } from "@/components/dashboard/YTDStatsOverview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import type { Announcement } from "@/lib/communications";
import { formatAnnouncementCategory } from "@/lib/communications";
import { loadPaymentIntentCache, type CachedPaymentIntent } from "@/lib/paymentCache";
import {
  fetchQuarterlyReport,
  fetchYTDStats,
  quarterSlug,
  type MemberQuarterlyReport,
  type YTDStats,
} from "@/lib/reports";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Flame,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AttendanceRecord = {
  session_id: number;
  session_title: string;
  session_starts_at: string;
  session_location?: string;
  status: string;
};

const CATEGORY_BADGE_VARIANT: Record<
  string,
  "warning" | "danger" | "info" | "default" | "success"
> = {
  rain_update: "warning",
  schedule_change: "danger",
  academy_update: "info",
  event: "success",
  competition: "info",
  general: "default",
};

export default function MemberDashboardPage() {
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resumePaymentIntent, setResumePaymentIntent] = useState<CachedPaymentIntent | null>(null);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<AttendanceRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [ytdStats, setYtdStats] = useState<YTDStats | null>(null);

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const leaderboardSlug = quarterSlug(currentYear, currentQuarter);

  useEffect(() => {
    apiGet("/api/v1/members/me", { auth: true })
      .then((data) => setMember(data))
      .catch((err) => console.error("Failed to load member", err))
      .finally(() => setLoading(false));

    // Fetch all attendance records (past + future) for heatmap + upcoming
    apiGet<AttendanceRecord[]>("/api/v1/attendance/me", { auth: true })
      .then((records) => {
        setAllRecords(records);
        const now = new Date();
        const upcoming = records
          .filter((r) => new Date(r.session_starts_at) > now)
          .sort(
            (a, b) =>
              new Date(a.session_starts_at).getTime() - new Date(b.session_starts_at).getTime()
          );
        setUpcomingBookings(upcoming);
      })
      .catch(() => {
        setAllRecords([]);
        setUpcomingBookings([]);
      });

    // Fetch recent announcements
    apiGet<Announcement[]>("/api/v1/communications/announcements/", { auth: true })
      .then((data) => {
        const recent = data
          .filter((a) => a.status === "published")
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);
        setAnnouncements(recent);
      })
      .catch(() => setAnnouncements([]));

    // Fetch YTD stats
    fetchYTDStats(currentYear)
      .then(setYtdStats)
      .catch(() => setYtdStats(null));
  }, [currentYear]);

  useEffect(() => {
    if (!member) return;
    const paymentMemberKey = member?.id
      ? String(member.id)
      : member?.email
        ? String(member.email)
        : "me";
    const cached = loadPaymentIntentCache(paymentMemberKey);
    if (cached?.purpose && cached.purpose !== "community_annual") {
      setResumePaymentIntent(null);
      return;
    }
    setResumePaymentIntent(cached || null);
  }, [member]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const firstName = member?.first_name || "Member";
  const now = Date.now();

  // Extract nested data with safe defaults
  const membership = member?.membership || {};
  const profile = member?.profile || {};
  const emergency = member?.emergency_contact || {};
  const availability = member?.availability || {};

  const communityPaidUntilMs = membership.community_paid_until
    ? Date.parse(String(membership.community_paid_until))
    : NaN;
  const communityActive = Number.isFinite(communityPaidUntilMs) && communityPaidUntilMs > now;
  const clubPaidUntilMs = membership.club_paid_until
    ? Date.parse(String(membership.club_paid_until))
    : NaN;
  const clubActive = Number.isFinite(clubPaidUntilMs) && clubPaidUntilMs > now;
  const academyPaidUntilMs = membership.academy_paid_until
    ? Date.parse(String(membership.academy_paid_until))
    : NaN;
  const academyActive = Number.isFinite(academyPaidUntilMs) && academyPaidUntilMs > now;

  const memberTiers =
    membership.active_tiers?.map((t: string) => t.toLowerCase()) ||
    (membership.primary_tier ? [membership.primary_tier.toLowerCase()] : ["community"]);

  const requestedTiers: string[] = (membership.requested_tiers || []).map((t: any) =>
    String(t).toLowerCase()
  );
  const wantsAcademy = requestedTiers.includes("academy");
  const wantsClub = requestedTiers.includes("club") || wantsAcademy;

  const clubContext = wantsClub || memberTiers.includes("club") || memberTiers.includes("academy");
  const academyContext = wantsAcademy || memberTiers.includes("academy");

  const hasProfileBasics = Boolean(
    member?.profile_photo_media_id && profile.gender && profile.date_of_birth
  );
  const hasCoreProfile = Boolean(
    profile.phone && profile.country && profile.city && profile.time_zone
  );
  const hasSwimBackground = Boolean(
    profile.swim_level &&
    profile.deep_water_comfort &&
    profile.personal_goals &&
    String(profile.personal_goals).trim()
  );
  const hasSafetyLogistics = Boolean(
    emergency.name &&
    emergency.contact_relationship &&
    emergency.phone &&
    availability.preferred_locations &&
    availability.preferred_locations.length > 0 &&
    availability.preferred_times &&
    availability.preferred_times.length > 0
  );
  const hasClubAvailability = Boolean(
    availability.available_days && availability.available_days.length > 0
  );
  const hasClubReadiness = !clubContext || hasClubAvailability;

  const needsProfileCore =
    !hasProfileBasics ||
    !profile.country ||
    !profile.city ||
    !profile.time_zone ||
    !profile.swim_level ||
    !hasSafetyLogistics ||
    !hasSwimBackground;
  const needsClubReadiness = clubContext && !hasClubAvailability;

  const assessment = membership.academy_skill_assessment;
  const hasAssessment =
    assessment &&
    ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some((k) =>
      Object.prototype.hasOwnProperty.call(assessment, k)
    );
  const needsAcademyReadiness =
    academyContext &&
    (!hasAssessment ||
      !membership.academy_goals ||
      !membership.academy_preferred_coach_gender ||
      !membership.academy_lesson_preference);
  const hasAcademyReadiness = !academyContext || !needsAcademyReadiness;

  const hasCoreOnboarding = hasProfileBasics && hasCoreProfile;
  const onboardingReadyForPayment =
    hasCoreOnboarding &&
    hasSafetyLogistics &&
    hasSwimBackground &&
    hasClubReadiness &&
    hasAcademyReadiness;
  const needsOnboarding = !onboardingReadyForPayment;

  // Calculate onboarding progress
  const totalSteps = 2 + (clubContext ? 1 : 0) + (academyContext ? 1 : 0);
  let completedSteps = 0;
  if (!needsProfileCore) completedSteps++;
  if (communityActive) completedSteps++;
  if (clubContext && !needsClubReadiness) completedSteps++;
  if (academyContext && !needsAcademyReadiness) completedSteps++;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const tierLabel =
    wantsAcademy && !academyActive
      ? "Academy (Pending)"
      : wantsClub && !clubActive
        ? "Club (Pending)"
        : memberTiers.includes("academy")
          ? "Academy"
          : memberTiers.includes("club")
            ? "Club"
            : "Community";

  const tierVariant: "info" | "success" | "warning" | "default" = memberTiers.includes("academy")
    ? "warning"
    : memberTiers.includes("club")
      ? "success"
      : "info";

  const resumeCheckoutUrl = resumePaymentIntent?.checkout_url || null;
  const showPaymentRecoveryBanner = !communityActive && onboardingReadyForPayment;
  const showCommunityActivationBanner = !communityActive && !onboardingReadyForPayment;
  const showAcademy = academyContext || memberTiers.includes("academy");

  const nextSession = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  return (
    <div className="space-y-6">
      {/* ── Section 1: Conditional Onboarding Banners ── */}
      {needsOnboarding && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500 p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-amber-300" />
                <span className="text-sm font-medium text-cyan-100">Complete Your Setup</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">You&apos;re {progressPercent}% there!</h2>
              <p className="text-cyan-100 text-sm max-w-md">
                Complete a few quick steps to unlock all features and get the most out of SwimBuddz.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{progressPercent}%</span>
              </div>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  {needsProfileCore ? (
                    <Circle className="h-4 w-4 text-cyan-200" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                  )}
                  <span className={needsProfileCore ? "text-white" : "text-cyan-200 line-through"}>
                    Complete profile, safety, and swim basics
                  </span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  {!communityActive ? (
                    <Circle className="h-4 w-4 text-cyan-200" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                  )}
                  <span className={!communityActive ? "text-white" : "text-cyan-200 line-through"}>
                    Activate Community membership
                  </span>
                </li>
                {(wantsClub || memberTiers.includes("club") || memberTiers.includes("academy")) && (
                  <li className="flex items-center gap-2 text-sm">
                    {needsClubReadiness ? (
                      <Circle className="h-4 w-4 text-cyan-200" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                    )}
                    <span
                      className={needsClubReadiness ? "text-white" : "text-cyan-200 line-through"}
                    >
                      Complete Club readiness
                    </span>
                  </li>
                )}
              </ul>
            </div>

            <div className="flex-shrink-0">
              <Link href="/account/onboarding">
                <Button variant="secondary" className="shadow-lg border-white/20">
                  Continue Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {showPaymentRecoveryBanner && (
        <Card className="overflow-hidden border-emerald-200 bg-emerald-50">
          <div className="md:hidden">
            <div className="p-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-emerald-100 p-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Onboarding complete</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Complete payment to activate your membership
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {resumeCheckoutUrl ? (
                <Button
                  className="w-full"
                  onClick={() => {
                    window.location.href = resumeCheckoutUrl;
                  }}
                >
                  Resume Payment
                </Button>
              ) : null}
              <Link href="/account/billing?required=community" className="block">
                <Button variant={resumeCheckoutUrl ? "outline" : "primary"} className="w-full">
                  Go to Billing
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 rounded-xl bg-emerald-100 p-3">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  Onboarding complete — payment pending
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Finish payment to activate your Community membership and unlock member features.
                </p>
                {resumePaymentIntent?.reference ? (
                  <p className="text-xs text-slate-500 mt-2">
                    Last payment reference:{" "}
                    <span className="font-mono">{resumePaymentIntent.reference}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                {resumeCheckoutUrl ? (
                  <Button
                    onClick={() => {
                      window.location.href = resumeCheckoutUrl;
                    }}
                  >
                    Resume payment
                  </Button>
                ) : null}
                <Link href="/account/billing?required=community">
                  <Button variant={resumeCheckoutUrl ? "outline" : "primary"}>Go to Billing</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Section 2: Personalized Greeting ── */}
      <GreetingHero
        firstName={firstName}
        profilePhotoMediaId={member?.profile_photo_media_id}
        tierLabel={tierLabel}
        tierVariant={tierVariant}
        nextSession={
          nextSession
            ? {
                title: nextSession.session_title,
                starts_at: nextSession.session_starts_at,
                location: nextSession.session_location,
              }
            : null
        }
        streakCurrent={ytdStats?.streak_current}
      />

      {/* ── Section 3: YTD Stats Overview ── */}
      {ytdStats && <YTDStatsOverview stats={ytdStats} year={currentYear} />}

      {/* ── Section 4: Next Session ── */}
      <NextSessionCard session={nextSession} />

      {/* ── Section 5: Conditional Action Banners ── */}
      {showCommunityActivationBanner && (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 rounded-xl bg-amber-100 p-3">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Activate Your Community Membership</h3>
              <p className="text-sm text-slate-600 mt-1">
                Pay ₦20,000/year to unlock the member directory, events, and community features.
              </p>
            </div>
            <Link href="/account/billing">
              <Button>Activate Now</Button>
            </Link>
          </div>
        </Card>
      )}

      {(wantsClub || wantsAcademy) && (
        <Card className="p-5 border-blue-200 bg-blue-50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 rounded-xl bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Your {wantsAcademy ? "Academy" : "Club"} Request is Saved
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Complete your readiness to speed up review. Payments happen when you activate a
                plan.
              </p>
            </div>
            <Link href="/account/onboarding">
              <Button variant="outline">Complete Readiness</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Section 6: Quick Actions ── */}
      <QuickActions leaderboardSlug={leaderboardSlug} showAcademy={showAcademy} />

      {/* ── Section 7: Swim Activity Heatmap ── */}
      <SwimCalendar records={allRecords} />

      {/* ── Section 8: Quarterly Report Widget ── */}
      <QuarterlyReportWidget />

      {/* ── Section 9: Recent Announcements ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Announcements
          </h2>
          <Link
            href="/account/notifications"
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {announcements.length > 0 ? (
          <div className="space-y-2">
            {announcements.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-full bg-cyan-100 p-2">
                    <Bell className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 text-sm">{a.title}</p>
                      <Badge
                        variant={CATEGORY_BADGE_VARIANT[a.category] || "default"}
                        className="text-[9px] px-2 py-0.5"
                      >
                        {formatAnnouncementCategory(a.category)}
                      </Badge>
                      {a.is_pinned && (
                        <span className="text-[10px] font-semibold text-amber-600">Pinned</span>
                      )}
                    </div>
                    {a.summary && (
                      <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{a.summary}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(a.published_at || a.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No announcements yet</p>
          </Card>
        )}
      </div>

      {/* ── Section 10: Community Leaderboard ── */}
      <Link href={`/account/reports/${leaderboardSlug}/leaderboard`} className="block">
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Community Leaderboard</h3>
                <p className="text-xs text-slate-500">See how you rank among other swimmers</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-amber-400" />
          </div>
        </Card>
      </Link>

      {/* ── Section 11: Coach Card (conditional) ── */}
      {member?.coach_profile && (
        <Link href="/coach/dashboard" className="block">
          <Card className="p-5 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100/50 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-purple-200 p-3">
                <Sparkles className="h-6 w-6 text-purple-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900">Coach Dashboard</h3>
                <p className="text-sm text-purple-700">
                  Manage your cohorts and view student progress
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-purple-400" />
            </div>
          </Card>
        </Link>
      )}
    </div>
  );
}

// ── Quarterly Report Widget ──

function QuarterlyReportWidget() {
  const [report, setReport] = useState<MemberQuarterlyReport | null>(null);
  const [loaded, setLoaded] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  useEffect(() => {
    fetchQuarterlyReport(year, quarter)
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [year, quarter]);

  const slug = `q${quarter}-${year}`;

  if (!loaded) {
    return (
      <Card className="p-6 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 animate-pulse">
        <div className="h-20" />
      </Card>
    );
  }

  if (!report) {
    return (
      <Link href="/account/reports" className="block">
        <Card className="p-5 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-cyan-200 p-3">
              <TrendingUp className="h-6 w-6 text-cyan-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-cyan-900">Your Quarterly Report</h3>
              <p className="text-sm text-cyan-700">
                View your Q{quarter} {year} stats and share your SwimBuddz Wrapped card
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-cyan-400" />
          </div>
        </Card>
      </Link>
    );
  }

  const stats = [
    {
      label: "Sessions",
      value: report.total_sessions_attended,
      icon: <Calendar className="h-4 w-4 text-cyan-600" />,
    },
    {
      label: "Attendance",
      value: `${(report.attendance_rate * 100).toFixed(0)}%`,
      icon: <TrendingUp className="h-4 w-4 text-green-600" />,
    },
    {
      label: "Streak",
      value: `${report.streak_longest}w`,
      icon: <Flame className="h-4 w-4 text-orange-500" />,
    },
    {
      label: "Bubbles",
      value: report.bubbles_earned,
      icon: <Wallet className="h-4 w-4 text-blue-600" />,
    },
  ];

  return (
    <Link href={`/account/reports/${slug}`} className="block">
      <Card className="overflow-hidden border-cyan-200 hover:shadow-lg transition-shadow">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-cyan-100">
                Q{quarter} {year} Swim Report
              </p>
              <h3 className="text-base font-bold text-white mt-0.5">Your Quarterly Report</h3>
            </div>
            <ArrowRight className="h-5 w-5 text-white/70" />
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-slate-100 bg-white">
          {stats.map((s) => (
            <div key={s.label} className="px-3 py-3 text-center">
              <div className="flex items-center justify-center mb-1">{s.icon}</div>
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </Link>
  );
}
