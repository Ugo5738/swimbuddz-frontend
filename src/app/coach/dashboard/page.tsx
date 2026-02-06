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
    getMyCoachEarnings,
    getPendingMilestoneReviews,
    type CoachDashboardSummary,
    type CoachEarnings,
    type Cohort,
    type PendingMilestoneReview,
} from "@/lib/coach";
import { AgreementApi } from "@/lib/coaches";
import { formatDate, formatNaira, formatRelativeTime } from "@/lib/format";
import {
    AlertCircle,
    Calendar,
    CheckCircle,
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
    const [earnings, setEarnings] = useState<CoachEarnings | null>(null);
    const [dashboard, setDashboard] = useState<CoachDashboardSummary | null>(null);
    const [pendingReviews, setPendingReviews] = useState<PendingMilestoneReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
            getMyCoachEarnings().catch(() => null),
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
                    Manage your cohorts, track student progress, and view upcoming sessions.
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
                            <p className="text-slate-600 font-medium">No sessions scheduled</p>
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

                    {/* Earnings Card */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Earnings
                            </h2>
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        {earnings ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-500">Total Earnings</p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {formatNaira(earnings.summary.total_earnings)}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-slate-50 rounded-lg p-2">
                                        <p className="text-slate-500 text-xs">Active</p>
                                        <p className="font-semibold text-slate-900">
                                            {earnings.summary.active_cohorts} cohorts
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2">
                                        <p className="text-slate-500 text-xs">Completed</p>
                                        <p className="font-semibold text-slate-900">
                                            {earnings.summary.completed_cohorts} cohorts
                                        </p>
                                    </div>
                                </div>
                                {earnings.rates.academy_cohort_stipend > 0 && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-xs text-slate-500">
                                            Cohort Stipend Rate
                                        </p>
                                        <p className="text-sm font-medium text-slate-700">
                                            {formatNaira(earnings.rates.academy_cohort_stipend)} / cohort
                                        </p>
                                    </div>
                                )}
                                {earnings.cohort_earnings.length > 0 && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 mb-2">
                                            Earnings by Cohort
                                        </p>
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {earnings.cohort_earnings.slice(0, 3).map((ce) => (
                                                <div
                                                    key={ce.cohort_id}
                                                    className="flex justify-between text-sm"
                                                >
                                                    <span className="text-slate-600 truncate mr-2">
                                                        {ce.cohort_name}
                                                    </span>
                                                    <span className="font-medium text-emerald-600">
                                                        {formatNaira(ce.earnings)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">
                                <p>Earnings will appear once you have active or completed cohorts.</p>
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
