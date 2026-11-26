"use client";

import {
  getNextSwimRewardCue,
  SwimRewards,
  type SwimProgress,
} from "@/components/swims/SwimRewards";
import { hasAcademyReadiness as isAcademyReadinessComplete } from "@/lib/academy-readiness";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { GreetingHero, type ProgrammePill } from "@/components/dashboard/GreetingHero";
import { MyPodCard } from "@/components/dashboard/MyPodCard";
import { NextSwimDashboardFocus } from "@/components/dashboard/NextSwimDashboardFocus";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SwimCalendar } from "@/components/dashboard/SwimCalendar";
import { YTDStatsOverview } from "@/components/dashboard/YTDStatsOverview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { useMemberProfile } from "@/lib/member-profile-context";
import type { Announcement } from "@/lib/communications";
import { loadPaymentIntentCache, type CachedPaymentIntent } from "@/lib/paymentCache";
import { getMyPod, type PodSummary } from "@/lib/pods";
import {
  fetchQuarterlyReport,
  fetchYTDAttendanceSummary,
  quarterSlug,
  type MemberQuarterlyReport,
  type MemberYtdAttendanceSummary,
} from "@/lib/reports";
import {
  getMembershipLabel,
  getPaidMembershipTier,
  getRequestedTiers,
  getTierStatus,
  hasTierContext,
  isTierPaid,
} from "@/lib/tiers";
import {
  ArrowRight,
  Megaphone,
  Trophy,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Flame,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DISMISSED_ANNOUNCEMENTS_KEY = "swimbuddz-dismissed-announcements";
const RECENT_ANNOUNCEMENT_MS = 14 * 24 * 60 * 60 * 1000;

type AttendanceRecord = {
  session_id: string;
  session_title: string;
  session_starts_at: string;
  session_ends_at?: string;
  session_location?: string;
  status: string;
};

export default function MemberDashboardPage() {
  const { data: member, loading, error, refetch } = useMemberProfile();
  const [resumePaymentIntent, setResumePaymentIntent] = useState<CachedPaymentIntent | null>(null);
  const { data: attendanceData } = useApi<AttendanceRecord[]>("/api/v1/attendance/me");
  const allRecords = useMemo(() => attendanceData ?? [], [attendanceData]);
  const { data: announcementData } = useApi<Announcement[]>("/api/v1/communications/announcements/");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [ytdStats, setYtdStats] = useState<MemberYtdAttendanceSummary | null>(null);
  const [myPod, setMyPod] = useState<PodSummary | null>(null);
  const [swimProgress, setSwimProgress] = useState<SwimProgress | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setDismissedIds(parsed.map(String));
      }
    } catch {
      // Ignore malformed local preferences.
    }
  }, []);

  const dismissAnnouncement = (id: string) => {
    setDismissedIds((current) => {
      const next = current.includes(id) ? current : [...current, id].slice(-50);
      try {
        localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  };

  // Surface only genuinely active pinned or recent (<= 14 days) announcements that haven't been dismissed.
  const activeAnnouncement = useMemo(() => {
    const now = Date.now();
    const list = (announcementData ?? [])
      .filter((a) => {
        if (a.status !== "published") return false;
        if (a.expires_at && new Date(a.expires_at).getTime() <= now) return false;
        if (dismissedIds.includes(a.id)) return false;
        const publishedTs = new Date(a.published_at || a.created_at).getTime();
        const isRecent = !Number.isNaN(publishedTs) && now - publishedTs <= RECENT_ANNOUNCEMENT_MS;
        return Boolean(a.is_pinned) || isRecent;
      })
      .sort(
        (a, b) =>
          Number(b.is_pinned) - Number(a.is_pinned) ||
          new Date(b.published_at || b.created_at).getTime() -
            new Date(a.published_at || a.created_at).getTime()
      );
    return list[0] ?? null;
  }, [announcementData, dismissedIds]);

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  // Leaderboard/report links point at the current quarter (matches the report widget)
  const leaderboardSlug = quarterSlug(currentYear, currentQuarter);

  useEffect(() => {
    // Fetch single-request all-swim YTD attendance summary (ADR-022)
    fetchYTDAttendanceSummary(currentYear)
      .then(setYtdStats)
      .catch(() => setYtdStats(null));

    // Fetch the member's current pod (Club tier; null if not in one).
    // Best-effort — failures shouldn't break the dashboard.
    getMyPod()
      .then(setMyPod)
      .catch(() => setMyPod(null));
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

  if (error && !member) {
    return <div role="alert" className="space-y-3 rounded-lg bg-rose-50 p-4 text-rose-900">
      <p>Could not load your profile. Please try again.</p>
      <Button onClick={refetch}>Retry</Button>
    </div>;
  }

  const firstName = member?.first_name || "Member";
  // Extract nested data with safe defaults
  const membership = member?.membership || {};
  const profile = member?.profile || {};
  const emergency = member?.emergency_contact || {};
  const availability = member?.availability || {};

  const communityActive = isTierPaid(member, "community");
  const requestedTiers = getRequestedTiers(member);
  const wantsAcademy = requestedTiers.includes("academy");
  const wantsClub = requestedTiers.includes("club");

  const clubContext = wantsClub || hasTierContext(member, "club");
  const academyContext = wantsAcademy || hasTierContext(member, "academy");

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

  const needsAcademyReadiness = academyContext && !isAcademyReadinessComplete(membership);
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
  const totalSteps = 1 + (clubContext ? 1 : 0) + (academyContext ? 1 : 0);
  let completedSteps = 0;
  if (!needsProfileCore) completedSteps++;
  if (clubContext && !needsClubReadiness) completedSteps++;
  if (academyContext && !needsAcademyReadiness) completedSteps++;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const paidTier = getPaidMembershipTier(member);
  const tierLabel = getMembershipLabel(member);
  const isAcademyMember = isTierPaid(member, "academy");
  const isClubMember = isTierPaid(member, "club");

  const tierVariant: "info" | "success" | "warning" | "default" = isAcademyMember
    ? "warning"
    : isClubMember
      ? "success"
      : tierLabel.includes("Pending")
        ? "warning"
        : paidTier === "prospect"
          ? "default"
          : "info";

  const resumeCheckoutUrl = resumePaymentIntent?.checkout_url || null;
  const membershipOnlyPath = !wantsClub && !wantsAcademy && !isClubMember && !isAcademyMember;
  const showPaymentRecoveryBanner =
    membershipOnlyPath && !communityActive && onboardingReadyForPayment;
  const showCommunityActivationBanner =
    membershipOnlyPath && !communityActive && !onboardingReadyForPayment;
  const showAcademy = wantsAcademy || isAcademyMember;


  const clubStatus = getTierStatus(member, "club");
  const academyStatus = getTierStatus(member, "academy");
  const programmePills: ProgrammePill[] = [];
  if (isClubMember) {
    programmePills.push({ key: "club", label: "Club Member", variant: "success" });
  } else if (wantsClub || clubStatus?.status === "requested") {
    programmePills.push({
      key: "club-req",
      label: "Club: Requested →",
      variant: "warning",
      href: "/upgrade/club/readiness",
    });
  }
  if (isAcademyMember) {
    programmePills.push({
      key: "academy",
      label: "Academy",
      variant: "info",
      href: "/account/academy",
    });
  } else if (wantsAcademy || academyStatus?.status === "requested") {
    programmePills.push({
      key: "academy-req",
      label: "Academy: Requested →",
      variant: "warning",
      href: needsAcademyReadiness ? "/account/onboarding?step=academy" : "/account/academy",
    });
  }

  const rewardCue = getNextSwimRewardCue(swimProgress);

  return (
    <div className="space-y-5">
      {/* ── Section 1: Conditional Onboarding & Payment Recovery Banners ── */}
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
                {clubContext && (
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

      {/* ── Section 2: Compact Personalized Greeting with Independent Programme Pills (ADR-001) ── */}
      <GreetingHero
        firstName={firstName}
        profilePhotoMediaId={member?.profile_photo_media_id}
        tierLabel={tierLabel}
        tierVariant={tierVariant}
        programmePills={programmePills}
        streakCurrent={ytdStats?.streak_current}
        streakLongest={ytdStats?.streak_longest}
      />

      {/* ── Section 3: Conditional Action Banners (surface pending steps before passive stats) ── */}
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

      {((wantsClub && needsClubReadiness) || (wantsAcademy && needsAcademyReadiness)) && (
        <Card className="p-5 border-blue-200 bg-blue-50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0 rounded-xl bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Your {needsAcademyReadiness ? "Academy" : "Club"} Request is Saved
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Complete your readiness to speed up review. Payments happen when you activate a
                plan.
              </p>
            </div>
            <Link
              href={needsAcademyReadiness ? "/account/onboarding?step=academy" : "/upgrade/club/readiness"}
            >
              <Button variant="outline">
                {needsAcademyReadiness ? "Continue Academy Setup" : "Continue Club Application"}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Conditional Slim Dismissible Announcement Strip (ADR-022: never renders empty box) ── */}
      {activeAnnouncement && (
        <div
          role="region"
          aria-label="Latest SwimBuddz update"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
            activeAnnouncement.is_pinned
              ? "border-amber-200 bg-amber-50/90 text-amber-950"
              : "border-cyan-200 bg-cyan-50/70 text-slate-900"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
            <Megaphone
              className={`h-4 w-4 shrink-0 ${
                activeAnnouncement.is_pinned ? "text-amber-700" : "text-cyan-700"
              }`}
              aria-hidden="true"
            />
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeAnnouncement.is_pinned
                  ? "bg-amber-200/70 text-amber-900"
                  : "bg-cyan-100 text-cyan-800"
              }`}
            >
              {activeAnnouncement.is_pinned ? "Pinned" : "Update"}
            </span>
            <Link
              href={`/announcements/${activeAnnouncement.id}`}
              className="truncate font-semibold hover:underline"
            >
              {activeAnnouncement.title}
            </Link>
            <Link
              href={`/announcements/${activeAnnouncement.id}`}
              className="shrink-0 text-xs font-semibold text-cyan-800 underline underline-offset-2"
            >
              Read →
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/account/notifications?filter=announcements"
              className="text-xs font-medium text-slate-600 hover:underline"
            >
              All updates
            </Link>
            <button
              type="button"
              onClick={() => dismissAnnouncement(activeAnnouncement.id)}
              aria-label="Dismiss announcement"
              className="rounded-lg p-1 text-slate-500 transition hover:bg-black/5 hover:text-slate-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Section 4: Hero Bento — Next Swim (65%) + Unified Wallet & Rewards (35%) ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <NextSwimDashboardFocus rewardCue={rewardCue} />
        </div>
        <div className="lg:col-span-4">
          <SwimRewards variant="dashboard" onProgressLoaded={setSwimProgress} />
        </div>
      </div>

      {/* ── Section 5: Quick Actions promoted right below the hero ── */}
      <QuickActions leaderboardSlug={leaderboardSlug} showAcademy={showAcademy} />

      {/* ── Section 6: Pod & Community (left) + All-Swim Summary (right) ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className={`${ytdStats ? "lg:col-span-7" : "lg:col-span-12"} space-y-4`}>
          {/* My Pod (Club members) */}
          {isClubMember && <MyPodCard pod={myPod} showJoinCta={!myPod} />}

          {/* Community highlights */}
          <section aria-labelledby="community-highlights-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="community-highlights-heading" className="text-base font-semibold text-slate-900">Your SwimBuddz community</h2>
              <Link href="/community/events" className="text-sm font-medium text-cyan-700 hover:underline">Explore community</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/account/reports/${leaderboardSlug}/leaderboard`} className="group block">
                <Card className="flex h-full items-start gap-3 border-amber-200 bg-amber-50/70 p-4 transition hover:border-amber-400 hover:shadow-sm">
                  <span className="rounded-xl bg-amber-100 p-2.5"><Trophy className="h-5 w-5 text-amber-700" /></span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Community leaderboard</h3>
                    <p className="mt-1 text-sm text-slate-600">Explore this quarter's swimmers, milestones and volunteering.</p>
                    <p className="mt-2 text-sm font-medium text-amber-800 group-hover:underline">View rankings →</p>
                  </div>
                </Card>
              </Link>
              <Link href="/community/events" className="group block">
                <Card className="flex h-full items-start gap-3 p-4 transition hover:border-cyan-300 hover:shadow-sm">
                  <span className="rounded-xl bg-cyan-100 p-2.5"><Calendar className="h-5 w-5 text-cyan-700" /></span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Events & experiences</h3>
                    <p className="mt-1 text-sm text-slate-600">Discover upcoming swims, activities and ways to connect.</p>
                    <p className="mt-2 text-sm font-medium text-cyan-700 group-hover:underline">See what's on →</p>
                  </div>
                </Card>
              </Link>
            </div>
          </section>
        </div>

        {ytdStats && (
          <div className="lg:col-span-5">
            <YTDStatsOverview stats={ytdStats} year={currentYear} />
          </div>
        )}
      </div>

      {/* Rich reporting remains available, but no longer blocks the primary experience. */}
      <details className="group rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
          Activity history & detailed reports
          <span className="ml-2 text-xs font-normal text-slate-500">Your swimming patterns and quarterly summary</span>
        </summary>
        <div className="mt-4 space-y-4">
          <SwimCalendar records={allRecords} />
          <QuarterlyReportWidget />
        </div>
      </details>

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
  const [reportSlug, setReportSlug] = useState("");
  const [reportLabel, setReportLabel] = useState("");
  const [loaded, setLoaded] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  useEffect(() => {
    // Always show the current quarter. The backend computes it on the fly when
    // no snapshot exists yet, so the dashboard never falls back to a past quarter.
    fetchQuarterlyReport(year, quarter)
      .then((r) => {
        if (r) {
          setReport(r);
          setReportSlug(`q${quarter}-${year}`);
          setReportLabel(`Q${quarter} ${year}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [year, quarter]);

  const slug = reportSlug || `q${quarter}-${year}`;

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
      label: report.activity_details?.wallet.available ? "Reward Bubbles" : "Wallet credits",
      value: report.activity_details?.wallet.available ? report.activity_details.wallet.metrics.reward_bubbles ?? 0 : report.bubbles_earned,
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
                {reportLabel || `Q${quarter} ${year}`} Swim Report
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
