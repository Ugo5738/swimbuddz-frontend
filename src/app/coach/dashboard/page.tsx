"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { StatsCard } from "@/components/ui/StatsCard";
import {
  calculateCohortStats,
  getCoachApplicationStatus,
  getCoachDashboard,
  getMyCoachCohorts,
  getPendingMilestoneReviews,
  type CoachDashboardSummary,
  type Cohort,
  type PendingMilestoneReview,
} from "@/lib/coach";
import { AgreementApi } from "@/lib/coaches";
import {
  getCoachEarningsSummary,
  type CoachEarningsSummary,
} from "@/lib/payouts";
import { formatDate, formatNaira, formatRelativeTime } from "@/lib/format";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  DollarSign,
  GraduationCap,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function CoachDashboardPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [earnings, setEarnings] = useState<CoachEarningsSummary | null>(null);
  const [dashboard, setDashboard] = useState<CoachDashboardSummary | null>(
    null,
  );
  const [pendingReviews, setPendingReviews] = useState<
    PendingMilestoneReview[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which cohort breakdowns are expanded on the earnings card.
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(
    new Set(),
  );
  const [accessVerified, setAccessVerified] = useState(false);

  // Defense-in-depth: verify coach status and agreement before showing dashboard
  useEffect(() => {
    async function checkAccess() {
      try {
        const status = await getCoachApplicationStatus();
        if (status.status === "approved") {
          router.push("/coach/onboarding");
          return;
        }
        if (status.status === "active") {
          try {
            const agreement = await AgreementApi.getAgreementStatus();
            if (!agreement.has_signed_current_version) {
              router.push("/coach/agreement");
              return;
            }
          } catch {
            // Agreement check failed — allow access (layout handles gating)
          }
        }
        setAccessVerified(true);
      } catch {
        // Layout-level checks will handle redirect
        setAccessVerified(true);
      }
    }
    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!accessVerified) return;

    Promise.all([
      getMyCoachCohorts(),
      getCoachEarningsSummary().catch(() => null),
      getCoachDashboard().catch(() => null),
      getPendingMilestoneReviews().catch(() => []),
    ])
      .then(([cohortsData, earningsData, dashboardData, reviewsData]) => {
        setCohorts(cohortsData);
        setEarnings(earningsData);
        setDashboard(dashboardData);
        setPendingReviews(reviewsData);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data", err);
        setError("Failed to load your dashboard. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [accessVerified]);

  const stats = useMemo(() => calculateCohortStats(cohorts), [cohorts]);

  // Use dashboard data if available, otherwise fall back to calculated stats
  const displayStats = dashboard
    ? {
        activeCohorts: dashboard.active_cohorts,
        upcomingCohorts: dashboard.upcoming_cohorts,
        completedCohorts: dashboard.completed_cohorts,
        totalStudents: dashboard.total_students,
        pendingReviews: dashboard.pending_milestone_reviews,
      }
    : {
        activeCohorts: stats.activeCohorts,
        upcomingCohorts: stats.upcomingCohorts,
        completedCohorts: stats.completedCohorts,
        totalStudents: 0,
        pendingReviews: 0,
      };

  // Separate active and upcoming cohorts
  const activeCohorts = cohorts.filter((c) => c.status === "active");
  const upcomingCohorts = cohorts
    .filter((c) => {
      const start = Date.parse(c.start_date);
      return (
        Number.isFinite(start) &&
        start > Date.now() &&
        c.status !== "completed" &&
        c.status !== "cancelled"
      );
    })
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date))
    .slice(0, 5);

  if (loading) {
    return <LoadingCard text="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Coach Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Manage your cohorts, track student progress, and view upcoming
          sessions.
        </p>
      </header>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          label="Active Cohorts"
          value={displayStats.activeCohorts}
          icon={<GraduationCap className="h-5 w-5" />}
          color="green"
          variant="elaborate"
        />
        <StatsCard
          label="Total Students"
          value={displayStats.totalStudents}
          icon={<Users className="h-5 w-5" />}
          color="cyan"
          variant="elaborate"
        />
        <StatsCard
          label="Pending Reviews"
          value={displayStats.pendingReviews}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color={displayStats.pendingReviews > 0 ? "amber" : "slate"}
          variant="elaborate"
        />
        <StatsCard
          label="Upcoming"
          value={displayStats.upcomingCohorts}
          icon={<Calendar className="h-5 w-5" />}
          color="blue"
          variant="elaborate"
        />
        <StatsCard
          label="Completed"
          value={displayStats.completedCohorts}
          icon={<CheckCircle className="h-5 w-5" />}
          color="slate"
          variant="elaborate"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Cohorts - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Cohorts */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  My Cohorts
                </h2>
                <p className="text-sm text-slate-600">
                  Cohorts you're currently teaching
                </p>
              </div>
              <Link href="/coach/cohorts">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {activeCohorts.length === 0 && upcomingCohorts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-600 font-medium">
                  No cohorts assigned yet
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Cohorts will appear here once you're assigned by an admin.
                </p>
                <div className="flex justify-center gap-3 mt-4">
                  <Link href="/coach/onboarding">
                    <Button size="sm">Update Availability</Button>
                  </Link>
                  <Link href="/coach/apply">
                    <Button size="sm" variant="outline">
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...activeCohorts, ...upcomingCohorts]
                  .slice(0, 4)
                  .map((cohort) => (
                    <CohortCard key={cohort.id} cohort={cohort} />
                  ))}
              </div>
            )}
          </Card>

          {/* Pending Milestone Reviews */}
          {pendingReviews.length > 0 && (
            <Card className="p-6 border-amber-200 bg-amber-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Pending Reviews
                    </h2>
                    <p className="text-sm text-slate-600">
                      Students waiting for milestone approval
                    </p>
                  </div>
                </div>
                <Link href="/coach/reviews">
                  <Button variant="outline" size="sm">
                    Review All
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {pendingReviews.slice(0, 3).map((review) => (
                  <div
                    key={review.progress_id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {review.student_name}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {review.milestone_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {review.cohort_name} • Claimed{" "}
                        {formatRelativeTime(review.claimed_at)}
                      </p>
                    </div>
                    <Link
                      href={`/coach/students/${review.enrollment_id}?review=${review.progress_id}`}
                    >
                      <Button size="sm" variant="secondary">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
                {pendingReviews.length > 3 && (
                  <p className="text-sm text-center text-amber-700">
                    +{pendingReviews.length - 3} more pending reviews
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Upcoming Sessions Placeholder */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Upcoming Sessions
                </h2>
                <p className="text-sm text-slate-600">
                  Your scheduled teaching sessions
                </p>
              </div>
              <Link href="/coach/schedule">
                <Button variant="outline" size="sm">
                  View Calendar
                </Button>
              </Link>
            </div>

            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium">
                No sessions scheduled
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Sessions will appear here once scheduled for your cohorts.
              </p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              {pendingReviews.length > 0 && (
                <Link href="/coach/reviews" className="block">
                  <Button
                    variant="secondary"
                    className="w-full justify-start bg-amber-50 hover:bg-amber-100 border-amber-200"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2 text-amber-600" />
                    Review Milestones
                    <Badge variant="warning" className="ml-auto">
                      {pendingReviews.length}
                    </Badge>
                  </Button>
                </Link>
              )}
              <Link href="/coach/cohorts" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  View All Cohorts
                </Button>
              </Link>
              <Link href="/coach/students" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  View Students
                </Button>
              </Link>
              <Link href="/coach/schedule" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
              </Link>
              <Link href="/coach/payouts" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  View Payouts
                </Button>
              </Link>
              <Link href="/coach/bank-account" className="block">
                <Button variant="secondary" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Bank Account
                </Button>
              </Link>
            </div>
          </Card>

          {/* Earnings Card — backed by recurring payout configs */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Earnings</h2>
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            {earnings ? (
              <div className="space-y-4">
                {/* Headline: total paid lifetime */}
                <div>
                  <p className="text-sm text-slate-500">Paid to date</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatNaira(earnings.total_paid_kobo / 100)}
                  </p>
                </div>

                {/* In-flight + upcoming */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-slate-500 text-xs">In flight</p>
                    <p className="font-semibold text-slate-900">
                      {formatNaira(earnings.total_pending_kobo / 100)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      pending / approved / processing
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <p className="text-emerald-700 text-xs">Next payout est.</p>
                    <p className="font-semibold text-emerald-900">
                      {formatNaira(earnings.upcoming_total_kobo / 100)}
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      across {earnings.upcoming_payouts.length} cohort
                      {earnings.upcoming_payouts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {/* Per-cohort upcoming breakdown — each row expands to
                    show the formula + per-student lines so the coach can
                    audit how the headline ₦ is computed. */}
                {earnings.upcoming_payouts.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs text-slate-500">
                      Upcoming by cohort
                    </p>
                    <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                      {earnings.upcoming_payouts.map((u) => {
                        const expanded = expandedConfigs.has(u.config_id);
                        const toggle = () =>
                          setExpandedConfigs((prev) => {
                            const next = new Set(prev);
                            if (next.has(u.config_id)) next.delete(u.config_id);
                            else next.add(u.config_id);
                            return next;
                          });
                        const bandPct = Number(u.band_percentage);
                        const cohortPriceN = u.cohort_price_amount / 100;
                        const perSessionN = u.per_session_amount_kobo / 100;
                        return (
                          <div
                            key={u.config_id}
                            className="rounded-lg bg-slate-50 text-sm overflow-hidden"
                          >
                            {/* Summary row */}
                            <button
                              type="button"
                              onClick={toggle}
                              className="w-full text-left p-2 hover:bg-slate-100 transition-colors"
                              aria-expanded={expanded}
                            >
                              <div className="flex justify-between gap-2 items-center">
                                <span className="text-slate-700 truncate flex-1">
                                  {u.cohort_name ?? u.cohort_id.slice(0, 8)}
                                </span>
                                <span className="font-medium text-emerald-700 whitespace-nowrap">
                                  {formatNaira(u.expected_amount_kobo / 100)}
                                </span>
                                {expanded ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Block {u.next_block_index + 1}/{u.total_blocks}{" "}
                                · {u.students_count} student
                                {u.students_count === 1 ? "" : "s"} · pays{" "}
                                {formatDate(u.next_run_date)}
                              </p>
                            </button>

                            {/* Expanded breakdown */}
                            {expanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-slate-200 space-y-3 bg-white">
                                {/* Formula */}
                                <div className="rounded-md bg-slate-50 p-2 text-[11px] text-slate-600 leading-relaxed font-mono">
                                  <p className="text-slate-500 mb-1 font-sans">
                                    How this is calculated
                                  </p>
                                  <p>
                                    {formatNaira(cohortPriceN)} ×{" "}
                                    <strong>{bandPct.toFixed(2)}%</strong> ÷{" "}
                                    {u.total_blocks} blocks ÷{" "}
                                    {u.sessions_in_block} sessions ={" "}
                                    <strong className="text-emerald-700">
                                      {formatNaira(perSessionN)}
                                    </strong>{" "}
                                    per student-session
                                  </p>
                                </div>

                                {/* Per-student table */}
                                <div>
                                  <p className="text-[11px] text-slate-500 mb-1">
                                    Per student in this block
                                  </p>
                                  <table className="w-full text-[11px]">
                                    <thead className="text-slate-500">
                                      <tr>
                                        <th className="text-left pb-1 font-medium">
                                          Student
                                        </th>
                                        <th className="text-right pb-1 font-medium">
                                          Delivered
                                        </th>
                                        <th className="text-right pb-1 font-medium">
                                          Excused
                                        </th>
                                        <th className="text-right pb-1 font-medium">
                                          Make-ups
                                        </th>
                                        <th className="text-right pb-1 font-medium">
                                          ₦
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-slate-700">
                                      {u.lines.map((ln) => (
                                        <tr
                                          key={ln.student_member_id}
                                          className="border-t border-slate-100"
                                        >
                                          <td className="py-1 truncate max-w-[120px]">
                                            {ln.student_name ??
                                              ln.student_member_id.slice(0, 8)}
                                          </td>
                                          <td className="py-1 text-right">
                                            {ln.sessions_delivered}
                                          </td>
                                          <td className="py-1 text-right">
                                            {ln.sessions_excused}
                                          </td>
                                          <td className="py-1 text-right">
                                            {ln.makeups_completed_in_block}
                                          </td>
                                          <td className="py-1 text-right font-medium">
                                            {formatNaira(ln.subtotal_kobo / 100)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="border-t border-slate-200 font-semibold">
                                        <td colSpan={4} className="py-1">
                                          Total
                                        </td>
                                        <td className="py-1 text-right text-emerald-700">
                                          {formatNaira(
                                            u.expected_amount_kobo / 100,
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                <p className="text-[11px] text-slate-500">
                                  <span className="text-slate-700 font-medium">
                                    Excused
                                  </span>{" "}
                                  absences become make-up obligations you can
                                  schedule on your{" "}
                                  <Link
                                    href={`/coach/cohorts/${u.cohort_id}/makeups`}
                                    className="underline text-cyan-700"
                                  >
                                    make-ups page
                                  </Link>
                                  ; the ₦ for those moves to whichever block
                                  you actually deliver them in.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent payout history */}
                {earnings.recent_payouts.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">
                      Recent payouts
                    </p>
                    <div className="space-y-1">
                      {earnings.recent_payouts.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-slate-600 truncate mr-2">
                            {p.period_label}
                          </span>
                          <span className="font-medium text-slate-900 inline-flex items-center gap-1">
                            {formatNaira(p.total_amount_kobo / 100)}
                            <Badge
                              variant={
                                p.status === "paid"
                                  ? "success"
                                  : p.status === "failed"
                                    ? "danger"
                                    : "default"
                              }
                              className="text-[10px]"
                            >
                              {p.status}
                            </Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                <p>
                  Earnings will appear once you have an active cohort with a
                  recurring payout config.
                </p>
              </div>
            )}
          </Card>

          {/* Profile Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Your Profile
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Keep your profile updated to get matched with the right students.
            </p>
            <div className="space-y-2">
              <Link href="/coach/apply">
                <Button size="sm" className="w-full">
                  Edit Profile
                </Button>
              </Link>
              <Link href="/coach/onboarding">
                <Button size="sm" variant="outline" className="w-full">
                  Update Availability
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  const statusVariant =
    cohort.status === "active"
      ? "success"
      : cohort.status === "open"
        ? "info"
        : cohort.status === "completed"
          ? "default"
          : "warning";

  const startDate = formatDate(cohort.start_date, { includeYear: false });
  const endDate = formatDate(cohort.end_date, { includeYear: false });

  return (
    <Link
      href={`/coach/cohorts/${cohort.id}`}
      className="block border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={statusVariant}>{cohort.status.toUpperCase()}</Badge>
        <span className="text-xs text-slate-500">{cohort.capacity} spots</span>
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">
        {cohort.name || cohort.program?.name || "Unnamed Cohort"}
      </h3>
      {cohort.program && (
        <p className="text-sm text-slate-600 mb-2">{cohort.program.name}</p>
      )}
      <div className="text-xs text-slate-500">
        <p>
          {startDate} - {endDate}
        </p>
        {cohort.location_name && <p className="mt-1">{cohort.location_name}</p>}
      </div>
    </Link>
  );
}
