"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type LeaderboardEntry = {
  rank: number;
  code_display: string;
  successful_referrals: number;
  total_bubbles_earned: number;
};

// ============================================================================
// Component
// ============================================================================

export default function PublicReferralLeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await apiGet<LeaderboardEntry[]>("/api/v1/wallet/referral/leaderboard");
      setEntries(data);
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingPage text="Loading leaderboard..." />;
  }

  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const rankDisplay = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-900">Top Referrers</h1>
          <p className="text-slate-600 mt-1">{monthName}</p>
        </div>

        {/* Leaderboard */}
        {entries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">No referrals yet this month. Be the first!</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Rank</th>
                    <th className="px-4 py-3 text-left font-medium">Code</th>
                    <th className="px-4 py-3 text-right font-medium">Referrals</th>
                    <th className="px-4 py-3 text-right font-medium">Bubbles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.rank} className={entry.rank <= 3 ? "bg-amber-50/50" : ""}>
                      <td className="px-4 py-3 font-medium text-lg">{rankDisplay(entry.rank)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="font-mono">
                          {entry.code_display}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {entry.successful_referrals}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {entry.total_bubbles_earned.toLocaleString()} 🫧
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* CTA */}
        <Card className="mt-8 p-6 text-center bg-gradient-to-br from-cyan-50 to-emerald-50">
          <p className="text-lg font-semibold text-slate-900 mb-2">
            Want to be on the leaderboard?
          </p>
          <p className="text-sm text-slate-600 mb-4">
            Get your referral code and start earning Bubbles!
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/account/wallet/referrals">
              <Button>Get My Referral Code</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Join SwimBuddz</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
