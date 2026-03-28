"use client";

import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { parseQuarterSlug, quarterLabel } from "@/lib/reports";
import {
  Award,
  Calendar,
  Clock,
  Crown,
  Flame,
  Heart,
  MapPin,
  Medal,
  Star,
  Trophy,
  Users,
  Wallet,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  rank: number;
  member_id: string;
  member_name: string;
  value: number;
  is_current_user: boolean;
}

interface LeaderboardResponse {
  category: string;
  year: number;
  quarter: number;
  entries: LeaderboardEntry[];
}

interface CommunityHighlights {
  total_pool_hours: number;
  total_active_members: number;
  total_sessions_held: number;
  total_volunteer_hours: number;
  community_milestones: { icon: string; text: string }[] | null;
  most_active_location: string | null;
  busiest_session_title: string | null;
  most_popular_day: string | null;
}

const MILESTONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  waves: Waves,
  map: MapPin,
  calendar: Calendar,
  users: Users,
  heart: Heart,
  clock: Clock,
  trophy: Trophy,
  star: Star,
  flame: Flame,
};

function getMilestoneIcon(iconName: string) {
  const Icon = MILESTONE_ICONS[iconName.toLowerCase()] ?? Waves;
  return Icon;
}

const CATEGORIES = [
  {
    key: "attendance",
    label: "Most Sessions",
    icon: Trophy,
    color: "text-amber-600",
    bg: "bg-amber-100",
    unit: "sessions",
  },
  {
    key: "streaks",
    label: "Longest Streak",
    icon: Flame,
    color: "text-orange-600",
    bg: "bg-orange-100",
    unit: "weeks",
  },
  {
    key: "milestones",
    label: "Most Milestones",
    icon: Award,
    color: "text-purple-600",
    bg: "bg-purple-100",
    unit: "",
  },
  {
    key: "volunteer_hours",
    label: "Volunteer Hours",
    icon: Heart,
    color: "text-rose-600",
    bg: "bg-rose-100",
    unit: "hrs",
  },
  {
    key: "bubbles_earned",
    label: "Bubbles Earned",
    icon: Wallet,
    color: "text-cyan-600",
    bg: "bg-cyan-100",
    unit: "",
  },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Star className="h-5 w-5 text-amber-700" />;
  return (
    <span className="flex h-5 w-5 items-center justify-center text-xs font-bold text-slate-400">
      {rank}
    </span>
  );
}

export default function LeaderboardPage() {
  const params = useParams();
  const slug = params.quarter as string;
  const parsed = parseQuarterSlug(slug);

  const [activeCategory, setActiveCategory] = useState("attendance");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [highlights, setHighlights] = useState<CommunityHighlights | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch community highlights once per quarter
  useEffect(() => {
    if (!parsed) return;
    apiGet<CommunityHighlights>(
      `/api/v1/reports/community/quarterly?year=${parsed.year}&quarter=${parsed.quarter}`,
      { auth: true }
    )
      .then(setHighlights)
      .catch(() => setHighlights(null));
  }, [slug]);

  useEffect(() => {
    if (!parsed) return;
    setLoading(true);
    apiGet<LeaderboardResponse>(
      `/api/v1/reports/community/leaderboards?year=${parsed.year}&quarter=${parsed.quarter}&category=${activeCategory}`,
      { auth: true }
    )
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug, activeCategory]);

  if (!parsed) {
    return <Card className="p-6 text-center text-slate-600">Invalid quarter format</Card>;
  }

  const label = quarterLabel(parsed.year, parsed.quarter);
  const activeCat = CATEGORIES.find((c) => c.key === activeCategory)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/account/reports/${slug}`}
          className="text-sm text-cyan-600 hover:text-cyan-700"
        >
          &larr; Back to {label} Report
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Community Leaderboard</h1>
        <p className="text-sm text-slate-500">{label}</p>
      </div>

      {/* Community Highlights */}
      {highlights && (
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Community Highlights</h2>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-cyan-50 p-3 text-center">
              <Waves className="mx-auto h-5 w-5 text-cyan-600 mb-1" />
              <p className="text-lg font-bold text-cyan-700">{highlights.total_pool_hours.toFixed(0)}h</p>
              <p className="text-xs text-slate-500">Pool Hours</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <Users className="mx-auto h-5 w-5 text-blue-600 mb-1" />
              <p className="text-lg font-bold text-blue-700">{highlights.total_active_members}</p>
              <p className="text-xs text-slate-500">Active Members</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <Calendar className="mx-auto h-5 w-5 text-green-600 mb-1" />
              <p className="text-lg font-bold text-green-700">{highlights.total_sessions_held}</p>
              <p className="text-xs text-slate-500">Sessions</p>
            </div>
          </div>

          {/* Quick facts */}
          {(highlights.most_active_location || highlights.busiest_session_title || highlights.most_popular_day) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {highlights.most_active_location && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                  <MapPin className="h-3 w-3" />
                  {highlights.most_active_location}
                </span>
              )}
              {highlights.busiest_session_title && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                  <Flame className="h-3 w-3" />
                  {highlights.busiest_session_title}
                </span>
              )}
              {highlights.most_popular_day && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-green-700">
                  <Calendar className="h-3 w-3" />
                  {highlights.most_popular_day}
                </span>
              )}
            </div>
          )}

          {/* Milestones */}
          {highlights.community_milestones && highlights.community_milestones.length > 0 && (
            <div className="space-y-2">
              {highlights.community_milestones.map((milestone, i) => {
                const Icon = getMilestoneIcon(milestone.icon);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-2.5"
                  >
                    <Icon className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">{milestone.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = cat.key === activeCategory;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                isActive
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <LoadingSpinner />
      ) : !data || data.entries.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-600">No leaderboard data available yet</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {data.entries.map((entry) => (
              <div
                key={entry.member_id}
                className={`flex items-center gap-4 px-4 py-3 ${
                  entry.is_current_user ? "bg-cyan-50 border-l-4 border-l-cyan-500" : ""
                } ${entry.rank <= 3 ? "bg-amber-50/30" : ""}`}
              >
                <RankIcon rank={entry.rank} />
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium truncate ${
                      entry.is_current_user ? "text-cyan-700" : "text-slate-900"
                    }`}
                  >
                    {entry.member_name}
                    {entry.is_current_user && (
                      <span className="ml-2 text-xs text-cyan-600">(You)</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">
                    {Number.isInteger(entry.value) ? entry.value : entry.value.toFixed(1)}
                  </span>
                  {activeCat.unit && (
                    <span className="text-xs text-slate-500">{activeCat.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
