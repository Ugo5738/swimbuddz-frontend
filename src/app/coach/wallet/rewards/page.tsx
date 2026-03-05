"use client";

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
};

type RewardHistoryResponse = {
  history: RewardHistoryEntry[];
  total: number;
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

// ============================================================================
// Component
// ============================================================================

export default function CoachRewardsDashboardPage() {
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
        setTotalBubblesEarned(hist.history.reduce((sum, h) => sum + h.bubbles_awarded, 0));
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coach/wallet">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Rewards</h1>
      </div>

      <Card className="p-5 md:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-emerald-200 p-3">
            <Award className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-600">Total Rewards Earned</p>
            <p className="text-3xl font-bold text-emerald-900">
              {totalBubblesEarned.toLocaleString()} 🫧
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">Keep coaching, keep earning!</p>
          </div>
        </div>
      </Card>

      {ambassador && (
        <AmbassadorBadge
          isAmbassador={ambassador.is_ambassador}
          ambassadorSince={ambassador.ambassador_since}
          referralCount={ambassador.successful_referrals}
          size="sm"
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent Rewards</h2>
          <Link
            href="/coach/wallet/rewards/history"
            className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
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
            {recentHistory.map((entry) => (
              <Card key={entry.id} className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {entry.display_name || entry.rule_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700 shrink-0">
                    +{entry.bubbles_awarded} 🫧
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
          How to Earn Bubbles
        </summary>
        <div className="mt-4 space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const catRules = groupedRules[cat];
            if (!catRules || catRules.length === 0) return null;
            const label = CATEGORY_LABELS[cat] || { label: cat, icon: "🫧" };
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <span>{label.icon}</span> {label.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
