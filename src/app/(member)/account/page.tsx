"use client";

import { hasAcademyReadiness as isAcademyReadinessComplete } from "@/lib/academy-readiness";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { GreetingHero } from "@/components/dashboard/GreetingHero";
import { MyPodCard } from "@/components/dashboard/MyPodCard";
import { NextSessionCard } from "@/components/dashboard/NextSessionCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SwimCalendar } from "@/components/dashboard/SwimCalendar";
import { YTDStatsOverview } from "@/components/dashboard/YTDStatsOverview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { useMemberProfile } from "@/lib/member-profile-context";
import type { Announcement } from "@/lib/communications";
import { formatAnnouncementCategory } from "@/lib/communications";
import { loadPaymentIntentCache, type CachedPaymentIntent } from "@/lib/paymentCache";
import { getMyPod, type PodSummary } from "@/lib/pods";
import {
  fetchQuarterlyReport,
  fetchYTDStats,
  quarterSlug,
  type MemberQuarterlyReport,
  type YTDStats,
} from "@/lib/reports";
import { SessionsApi, type Session } from "@/lib/sessions";
import {
  getMembershipLabel,
  getPaidMembershipTier,
  getRequestedTiers,
  hasTierContext,
  isTierPaid,
} from "@/lib/tiers";
import {
  ArrowRight,
  Bell,
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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const { data: attendanceData, loading: attendanceLoading } = useApi<AttendanceRecord[]>("/api/v1/attendance/me");
  const allRecords = useMemo(() => attendanceData ?? [], [attendanceData]);
  const attendanceLoaded = !attendanceLoading;
  const upcomingBookings = useMemo(() => allRecords
    .filter((record) => new Date(record.session_starts_at) > new Date())
    .sort((a, b) => new Date(a.session_starts_at).getTime() - new Date(b.session_starts_at).getTime()),
  [allRecords]);
  const [bookedSessionSignInEligible, setBookedSessionSignInEligible] = useState(false);
  const [nextAvailableSession, setNextAvailableSession] = useState<{
    session_id: string;
    session_title: string;
    session_starts_at: string;
    session_ends_at?: string;
    session_location?: string;
  } | null>(null);
  const { data: announcementData } = useApi<Announcement[]>("/api/v1/communications/announcements/");
  const announcements = useMemo(() => (announcementData ?? [])
    .filter((a) => a.status === "published" && (!a.expires_at || new Date(a.expires_at).getTime() > Date.now()))
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) ||
      new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
    .slice(0, 2), [announcementData]);
  const [ytdStats, setYtdStats] = useState<YTDStats | null>(null);
  const [myPod, setMyPod] = useState<PodSummary | null>(null);

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  // Leaderboard/report links point at the current quarter (matches the report widget)
  const leaderboardSlug = quarterSlug(currentYear, currentQuarter);

  useEffect(() => {
    // Fetch YTD stats
    fetchYTDStats(currentYear)
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

  // Fetch the next session the backend says this member can book.
  useEffect(() => {
    // Do not request the full session catalogue while attendance is still
    // loading: the member may already have an upcoming reservation.
    if (!member || !attendanceLoaded || upcomingBookings.length > 0) return;

    SessionsApi.listSessions({ auth: true })
      .then((sessions: Session[]) => {
        const futurePublished = sessions
          .filter(
            (s) =>
              s.status === "scheduled" &&
              new Date(s.starts_at) > new Date() &&
              s.access?.bookable === true
          )
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

        if (futurePublished.length > 0) {
          const s = futurePublished[0];
          setNextAvailableSession({
            session_id: s.id,
            session_title: s.title,
            session_starts_at: s.starts_at,
            session_ends_at: s.ends_at,
            session_location: s.location || undefined,
          });
        }
      })
      .catch(() => {});
  }, [member, attendanceLoaded, upcomingBookings]);

  useEffect(() => {
    const booking = upcomingBookings[0];
    if (!booking) {
      setBookedSessionSignInEligible(false);
      return;
    }

    let cancelled = false;
    SessionsApi.getSession(String(booking.session_id), { auth: true })
      .then((session) => {
        if (!cancelled) {
          setBookedSessionSignInEligible(session.access?.sign_in_eligible === true);
        }
      })
      .catch(() => {
        if (!cancelled) setBookedSessionSignInEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [upcomingBookings]);

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

  // Show booked session first, fall back to next available session
  const nextSession = upcomingBookings.length > 0 ? upcomingBookings[0] : nextAvailableSession;

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
        streakLongest={ytdStats?.streak_longest}
      />

      {/* Next swim is the primary action; progress follows rather than obscuring it. */}
      {/* ── Section 4: Next Session ── */}
      <NextSessionCard
        session={nextSession}
        isBooked={upcomingBookings.length > 0}
        attendanceStatus={
          // Only meaningful when the next session came from an existing
          // attendance record (upcomingBookings path). Otherwise undefined.
          upcomingBookings.length > 0 ? upcomingBookings[0]?.status : null
        }
        signInEligible={upcomingBookings.length > 0 ? bookedSessionSignInEligible : false}
      />

      {/* Key activity metrics are secondary to the next booking. */}
      {ytdStats && <YTDStatsOverview stats={ytdStats} year={currentYear} />}

      {/* ── Section 4b: My Pod (Club members only — see docs/club/POD_OPERATIONS.md) ── */}
      {isClubMember && <MyPodCard pod={myPod} showJoinCta={!myPod} />}

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

      {/* ── Section 6: Quick Actions ── */}
      <QuickActions leaderboardSlug={leaderboardSlug} showAcademy={showAcademy} />

      {/* Community engagement must be discoverable without scrolling past reports and heatmaps. */}
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

      {/* Announcements are a compact feed; urgent pinned items stay visually distinct. */}
      <section aria-labelledby="member-updates-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="member-updates-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Megaphone className="h-5 w-5 text-cyan-700" /> Latest updates
          </h2>
          <Link href="/account/notifications?filter=announcements" className="text-sm font-medium text-cyan-700 hover:underline">All announcements →</Link>
        </div>
        {announcements.length ? (
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {announcements.map((a) => (
              <Link key={a.id} href={`/announcements/${a.id}`} className={`flex items-start gap-3 p-4 transition hover:bg-slate-50 ${a.is_pinned ? "bg-amber-50/60" : ""}`}>
                <Bell className={`mt-1 h-4 w-4 shrink-0 ${a.is_pinned ? "text-amber-600" : "text-slate-400"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    {a.is_pinned && <span className="text-xs font-semibold text-amber-800">Pinned</span>}
                  </div>
                  {a.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.summary}</p>}
                  <p className="mt-1 text-xs text-slate-500">{formatAnnouncementCategory(a.category)}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            ))}
          </Card>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No new announcements at the moment.</p>
        )}
      </section>

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
