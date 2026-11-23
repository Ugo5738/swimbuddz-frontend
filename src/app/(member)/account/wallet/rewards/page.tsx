"use client";

import { SwimRewards } from "@/components/swims/SwimRewards";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { AmbassadorBadge } from "@/components/wallet/AmbassadorBadge";
import { RewardRuleCard } from "@/components/wallet/RewardRuleCard";
import { apiGet } from "@/lib/api";
import { ArrowLeft, Award, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type RewardRule = {
  id: string;
  rule_name: string;
  display_name: string;
  description?: string | null;
  event_type: string;
  category: string;
  reward_bubbles: number;
  max_per_member_lifetime?: number | null;
  max_per_member_per_period?: number | null;
  period?: string | null;
  requires_admin_confirmation: boolean;
  is_active: boolean;
};

type RewardRuleListResponse = {
  items: RewardRule[];
  total: number;
};

type RewardHistoryEntry = {
  id: string;
  rule_name: string;
  display_name?: string | null;
  category: string;
  bubbles_awarded: number;
  description?: string | null;
  created_at: string;
  is_reversal?: boolean;
};

type RewardHistoryResponse = {
  history: RewardHistoryEntry[];
  total: number;
  total_bubbles_awarded?: number;
};

type AmbassadorStatus = {
  is_ambassador: boolean;
  ambassador_since?: string | null;
  successful_referrals: number;
};

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_ORDER = ["retention", "acquisition", "academy", "community", "spending"];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  retention: { label: "Attendance & Streaks", icon: "🏊" },
  acquisition: { label: "Referrals", icon: "👥" },
  academy: { label: "Academy", icon: "🎓" },
  community: { label: "Community", icon: "🤝" },
  spending: { label: "Spending", icon: "💰" },
};

function groupRulesByCategory(rules: RewardRule[]) {
  const groups: Record<string, RewardRule[]> = {};
  for (const rule of rules) {
    if (!groups[rule.category]) groups[rule.category] = [];
    groups[rule.category].push(rule);
  }
  return groups;
}

function formatBubbleDelta(amount: number): string {
  return amount < 0 ? `${amount} 🫧` : `+${amount} 🫧`;
}

// ============================================================================
// Component
// ============================================================================

export default function RewardsDashboardPage() {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [recentHistory, setRecentHistory] = useState<RewardHistoryEntry[]>([]);
  const [totalBubblesEarned, setTotalBubblesEarned] = useState(0);
  const [ambassador, setAmbassador] = useState<AmbassadorStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiGet<RewardRuleListResponse>("/api/v1/wallet/rewards/rules", {
          auth: true,
        }),
        apiGet<RewardHistoryResponse>("/api/v1/wallet/rewards/history?limit=10", { auth: true }),
        apiGet<AmbassadorStatus>("/api/v1/wallet/referral/ambassador", {
          auth: true,
        }),
      ]);

      if (results[0].status === "fulfilled") {
        setRules((results[0].value.items ?? []).filter((r) => r.is_active));
      }
      if (results[1].status === "fulfilled") {
        const hist = results[1].value;
        setRecentHistory(hist.history);
        setTotalBubblesEarned(
          typeof hist.total_bubbles_awarded === "number"
            ? hist.total_bubbles_awarded
            : hist.history.reduce((sum, h) => sum + h.bubbles_awarded, 0)
        );
      }
      if (results[2].status === "fulfilled") {
        setAmbassador(results[2].value);
      }
    } catch (e) {
      console.error("Failed to load rewards data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingPage text="Loading rewards..." />;
  }

  const groupedRules = groupRulesByCategory(rules);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/account/wallet">
            <Button variant="ghost" size="sm" aria-label="Back to wallet">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rewards</h1>
            <p className="text-xs text-slate-500">
              Your all-time swimming milestones, weekly Swim Bubbles, and reward history.
            </p>
          </div>
        </div>
        <Link
          href="/account/wallet/rewards/history"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-cyan-300 hover:text-cyan-800"
        >
          Full reward history <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Swim Bubbles Programme (since 22 Nov 2026) + All-Time Swimming Milestones */}
      <SwimRewards variant="hub" />

      {/* Lifetime Rewards Across All Sources (server-computed full total, net of reversals) */}
      <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/70 border-emerald-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-200 p-3">
              <Award className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700">
                All-Time Rewards Earned (All Sources)
              </p>
              <p className="text-3xl font-bold tabular-nums text-emerald-950">
                {totalBubblesEarned.toLocaleString()} 🫧
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Includes swim rewards, referrals, community volunteering, and academy milestones.
              </p>
            </div>
          </div>
          {ambassador && (
            <AmbassadorBadge
              isAmbassador={ambassador.is_ambassador}
              ambassadorSince={ambassador.ambassador_since}
              referralCount={ambassador.successful_referrals}
              size="sm"
            />
          )}
        </div>
      </Card>

      {/* Recent Rewards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent Reward Activity</h2>
          <Link
            href="/account/wallet/rewards/history"
            className="text-sm text-cyan-700 hover:text-cyan-800 font-medium flex items-center gap-1"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentHistory.length === 0 ? (
          <Card className="p-6 bg-slate-50 border-dashed text-center">
            <Award className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No rewards yet — start earning by attending sessions!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentHistory.map((entry) => {
              const isReversal = Boolean(entry.is_reversal || entry.bubbles_awarded < 0);
              return (
                <Card key={entry.id} className="p-3.5 md:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {entry.display_name || entry.rule_name}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          {entry.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums shrink-0 ${
                        isReversal
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {formatBubbleDelta(entry.bubbles_awarded)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Ways to Earn Section */}
      <details open className="rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
          Ways to Earn Bubbles
        </summary>
        <div className="mt-4 space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const catRules = groupedRules[cat];
            if (!catRules || catRules.length === 0) return null;
            const label = CATEGORY_LABELS[cat] || {
              label: cat,
              icon: "🫧",
            };

            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span>{label.icon}</span> {label.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {catRules.map((rule) => (
                    <RewardRuleCard
                      key={rule.id}
                      displayName={rule.display_name}
                      description={rule.description}
                      bubbleAmount={rule.reward_bubbles}
                      category={rule.category}
                      maxPerMemberLifetime={rule.max_per_member_lifetime}
                      maxPerMemberPeriod={rule.max_per_member_per_period}
                      period={rule.period}
                      requiresAdminConfirmation={rule.requires_admin_confirmation}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
