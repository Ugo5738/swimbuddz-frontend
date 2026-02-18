"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  RECOGNITION_LABELS,
  VolunteersApi,
  type LeaderboardEntry,
} from "@/lib/volunteers";
import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Period = "all_time" | "this_month";

const PERIOD_OPTIONS = [
  { value: "all_time" as const, label: "All Time" },
  { value: "this_month" as const, label: "This Month" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<Period>("all_time");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await VolunteersApi.getLeaderboard(period);
      setEntries(data);
    } catch {
      setError("Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  const medalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  const recognitionBadge = (tier: string | null) => {
    if (!tier) return null;
    const variant =
      tier === "gold" ? "warning" : tier === "silver" ? "default" : "info";
    return (
      <Badge variant={variant}>
        {RECOGNITION_LABELS[tier as keyof typeof RECOGNITION_LABELS]}
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      {/* Back + Header */}
      <div className="space-y-3">
        <Link
          href="/community/volunteers"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Volunteer Hub
        </Link>
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-amber-500" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Volunteer Leaderboard
          </h1>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Period Filter */}
      <FilterTabs
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
      />

      {loading ? (
        <LoadingPage text="Loading leaderboard..." />
      ) : entries.length === 0 ? (
        <Card className="py-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-slate-600">
            No volunteer activity yet for this period.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card
              key={entry.member_id}
              className={
                entry.rank <= 3 ? "border-amber-200 bg-amber-50/50" : ""
              }
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-10 text-center">
                  <span
                    className={
                      entry.rank <= 3
                        ? "text-2xl"
                        : "text-lg font-bold text-slate-500"
                    }
                  >
                    {medalEmoji(entry.rank)}
                  </span>
                </div>

                {/* Name + Recognition */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {entry.member_name || "Anonymous"}
                  </p>
                  {entry.recognition_tier && (
                    <div className="mt-1">
                      {recognitionBadge(entry.recognition_tier)}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-bold text-slate-900">
                    {entry.total_hours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.total_sessions} session
                    {entry.total_sessions !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
