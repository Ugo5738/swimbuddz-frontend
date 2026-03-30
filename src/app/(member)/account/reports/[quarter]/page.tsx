"use client";

import { AchievementsList } from "@/components/reports/AchievementsList";
import { AttendanceBreakdown } from "@/components/reports/AttendanceBreakdown";
import { ShareableCardPreview } from "@/components/reports/ShareableCardPreview";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatsCard } from "@/components/ui/StatsCard";
import { apiGet } from "@/lib/api";
import {
  downloadPdfReport,
  fetchQuarterlyReport,
  parseQuarterSlug,
  quarterLabel,
  type MemberQuarterlyReport,
} from "@/lib/reports";
import {
  Award,
  Calendar,
  Clock,
  Download,
  Flame,
  GraduationCap,
  Heart,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function QuarterlyReportPage() {
  const params = useParams();
  const slug = params.quarter as string;
  const parsed = parseQuarterSlug(slug);

  const [report, setReport] = useState<MemberQuarterlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [communityMilestones, setCommunityMilestones] = useState<
    { icon: string; text: string }[]
  >([]);

  useEffect(() => {
    if (!parsed) {
      setError("Invalid quarter format");
      setLoading(false);
      return;
    }
    fetchQuarterlyReport(parsed.year, parsed.quarter)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    // Fetch community milestones
    apiGet<{ community_milestones?: { icon: string; text: string }[] }>(
      `/api/v1/reports/community/quarterly?year=${parsed.year}&quarter=${parsed.quarter}`,
      { auth: true },
    )
      .then((data) => setCommunityMilestones(data.community_milestones || []))
      .catch(() => {});
  }, [slug]);

  if (loading) return <LoadingSpinner />;

  if (error || !report || !parsed) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Quarterly Report</h1>
        <Card className="p-6 text-center">
          <p className="text-slate-600">{error || "Report not available for this quarter."}</p>
          <p className="text-sm text-slate-500 mt-2">
            Reports are generated at the end of each quarter. Check back soon!
          </p>
        </Card>
      </div>
    );
  }

  const label = quarterLabel(parsed.year, parsed.quarter);

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-100">Your Swim Report</p>
            <h1 className="text-3xl font-bold mt-1">{label}</h1>
            <p className="text-lg text-cyan-100 mt-1">{report.member_name}</p>
            {report.is_first_quarter && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900">
                <Star className="h-3.5 w-3.5" />
                You joined SwimBuddz this quarter!
              </span>
            )}
          </div>
          <button
            onClick={async () => {
              if (!parsed) return;
              setDownloadingPdf(true);
              try {
                await downloadPdfReport(parsed.year, parsed.quarter);
              } catch {
                // silently fail — user can try again
              } finally {
                setDownloadingPdf(false);
              }
            }}
            disabled={downloadingPdf}
            className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-50 transition backdrop-blur-sm"
          >
            <Download className="h-4 w-4" />
            {downloadingPdf ? "Downloading..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Percentile nudge */}
      {report.attendance_percentile >= 0.5 && (
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <p className="text-center text-sm font-semibold text-amber-800">
            You&apos;re in the{" "}
            <span className="text-lg font-bold text-amber-600">
              top {Math.max(1, Math.round((1 - report.attendance_percentile) * 100))}%
            </span>{" "}
            of swimmers this quarter!
          </p>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {report.pool_hours > 0 && (
          <StatsCard
            label="Pool Hours"
            value={`${report.pool_hours.toFixed(1)}h`}
            icon={<Clock className="h-6 w-6" />}
            color="cyan"
          />
        )}
        <StatsCard
          label="Sessions Attended"
          value={report.total_sessions_attended}
          icon={<Calendar className="h-6 w-6" />}
          color="cyan"
        />
        <StatsCard
          label="Attendance Rate"
          value={`${(report.attendance_rate * 100).toFixed(0)}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <StatsCard
          label="Longest Streak"
          value={`${report.streak_longest} weeks`}
          icon={<Flame className="h-6 w-6" />}
          color="orange"
        />
        {(report.milestones_achieved > 0 ||
          report.member_tier === "academy") && (
          <StatsCard
            label="Milestones Achieved"
            value={report.milestones_achieved}
            icon={<Award className="h-6 w-6" />}
            color="purple"
          />
        )}
        <StatsCard
          label="Bubbles Earned"
          value={report.bubbles_earned}
          icon={<Wallet className="h-6 w-6" />}
          color="blue"
        />
        {report.volunteer_hours > 0 && (
          <StatsCard
            label="Volunteer Hours"
            value={`${report.volunteer_hours >= 1 ? report.volunteer_hours.toFixed(0) : report.volunteer_hours.toFixed(1)}h`}
            icon={<Heart className="h-6 w-6" />}
            color="rose"
          />
        )}
      </div>

      {/* Attendance breakdown */}
      {report.sessions_by_type && (
        <AttendanceBreakdown
          sessionsByType={report.sessions_by_type}
          favoriteDay={report.favorite_day}
          favoriteLocation={report.favorite_location}
          punctualityRate={report.punctuality_rate}
        />
      )}

      {/* Achievements */}
      <AchievementsList
        milestonesAchieved={report.milestones_achieved}
        milestonesInProgress={report.milestones_in_progress}
        certificatesEarned={report.certificates_earned}
        programsEnrolled={report.programs_enrolled}
        academySkills={report.academy_skills}
      />

      {/* Additional stats */}
      {(report.orders_placed > 0 || report.rides_taken > 0 || report.events_attended > 0) && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3">More Highlights</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {report.orders_placed > 0 && (
              <div className="flex items-center gap-2 text-slate-600">
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {report.orders_placed} store order
                  {report.orders_placed > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {report.rides_taken > 0 && (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="h-4 w-4" />
                <span>
                  {report.rides_taken} ride
                  {report.rides_taken > 1 ? "s" : ""} shared
                </span>
              </div>
            )}
            {report.events_attended > 0 && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {report.events_attended} event
                  {report.events_attended > 1 ? "s" : ""} attended
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Academy cohorts */}
      {report.cohorts_completed > 0 && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {report.cohorts_completed} cohort{report.cohorts_completed > 1 ? "s" : ""} completed!
              </p>
              <p className="text-xs text-slate-500">Academy graduation this quarter</p>
            </div>
          </div>
        </Card>
      )}

      {/* Community milestones */}
      {communityMilestones.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-600" />
            Community Milestones
          </h3>
          <div className="space-y-3">
            {communityMilestones.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-cyan-50 p-3"
              >
                <Waves className="h-5 w-5 text-cyan-600 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-700">{m.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Community leaderboard link */}
      <Link href={`/account/reports/${slug}/leaderboard`}>
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Community Leaderboard</p>
                <p className="text-xs text-slate-500">See how you rank among other swimmers</p>
              </div>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </div>
        </Card>
      </Link>

      {/* Shareable card */}
      <ShareableCardPreview year={parsed.year} quarter={parsed.quarter} />
    </div>
  );
}
