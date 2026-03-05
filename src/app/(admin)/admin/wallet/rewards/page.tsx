"use client";

import { ManualRewardEventModal } from "@/components/admin/ManualRewardEventModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPatch } from "@/lib/api";
import { Award, ChevronRight, Plus, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type RewardRule = {
  id: string;
  rule_name: string;
  display_name: string;
  description?: string | null;
  event_type: string;
  trigger_config?: Record<string, unknown> | null;
  reward_bubbles: number;
  reward_description_template?: string | null;
  max_per_member_lifetime?: number | null;
  max_per_member_per_period?: number | null;
  period?: string | null;
  replaces_rule_id?: string | null;
  category: string;
  is_active: boolean;
  priority: number;
  requires_admin_confirmation: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

type RewardRuleListResponse = {
  items: RewardRule[];
  total: number;
};

type RewardStats = {
  total_rules_active: number;
  total_events_processed: number;
  total_events_pending: number;
  total_bubbles_distributed: number;
  events_by_type: { event_type: string; count: number }[];
  top_rules_by_usage: {
    rule_name: string;
    display_name: string;
    total_grants: number;
    total_bubbles: number;
  }[];
};

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "acquisition", label: "Acquisition" },
  { value: "retention", label: "Retention" },
  { value: "community", label: "Community" },
  { value: "spending", label: "Spending" },
  { value: "academy", label: "Academy" },
];

const CATEGORY_COLORS: Record<string, string> = {
  acquisition: "bg-blue-100 text-blue-700",
  retention: "bg-emerald-100 text-emerald-700",
  community: "bg-teal-100 text-teal-700",
  spending: "bg-purple-100 text-purple-700",
  academy: "bg-purple-100 text-purple-700",
};

// ============================================================================
// Component
// ============================================================================

export default function AdminRewardRulesPage() {
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [showEventModal, setShowEventModal] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, statsData] = await Promise.all([
        apiGet<RewardRuleListResponse>("/api/v1/admin/wallet/rewards/rules", {
          auth: true,
        }),
        apiGet<RewardStats>("/api/v1/admin/wallet/rewards/stats", {
          auth: true,
        }),
      ]);
      setRules(rulesRes.items ?? []);
      setStats(statsData);
    } catch (e) {
      console.error("Failed to load reward rules:", e);
      toast.error("Failed to load reward rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleRule = async (ruleId: string, currentActive: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(ruleId));
    try {
      await apiPatch(
        `/api/v1/admin/wallet/rewards/rules/${ruleId}`,
        { is_active: !currentActive },
        { auth: true }
      );
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r))
      );
      toast.success(`Rule ${!currentActive ? "activated" : "deactivated"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update rule");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  if (loading) {
    return <LoadingPage text="Loading reward rules..." />;
  }

  const filteredRules = rules.filter((rule) => {
    if (categoryFilter && rule.category !== categoryFilter) return false;
    if (activeFilter === "active" && !rule.is_active) return false;
    if (activeFilter === "inactive" && rule.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Reward Rules</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/wallet/rewards/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Rule
            </Button>
          </Link>
          <Button onClick={() => setShowEventModal(true)} size="sm" variant="outline">
            <Send className="h-4 w-4 mr-1.5" />
            Submit Event
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Active Rules</p>
            <p className="text-lg font-semibold text-slate-900">{stats.total_rules_active}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Events Processed</p>
            <p className="text-lg font-semibold text-slate-900">
              {(stats.total_events_processed ?? 0).toLocaleString()}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Pending Events</p>
            <p className="text-lg font-semibold text-amber-600">
              {(stats.total_events_pending ?? 0).toLocaleString()}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Bubbles Distributed</p>
            <p className="text-lg font-semibold text-emerald-600">
              {(stats.total_bubbles_distributed ?? 0).toLocaleString()}
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {(["all", "active", "inactive"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`px-3 py-2 text-sm font-medium capitalize transition ${
                activeFilter === status
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <span className="flex items-center text-sm text-slate-500">
          {filteredRules.length} rule{filteredRules.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {filteredRules.map((rule) => (
          <Link key={rule.id} href={`/admin/wallet/rewards/${rule.id}`}>
            <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="rounded-full p-2 bg-emerald-100 shrink-0">
                    <Award className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {rule.display_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${CATEGORY_COLORS[rule.category] || ""}`}
                      >
                        {rule.category}
                      </Badge>
                      <span className="text-xs text-slate-500">{rule.event_type}</span>
                      {rule.max_per_member_per_period && rule.period && (
                        <span className="text-xs text-slate-400">
                          max {rule.max_per_member_per_period}/{rule.period}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-emerald-700">
                    +{rule.reward_bubbles} 🫧
                  </span>
                  {/* Toggle switch */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleRule(rule.id, rule.is_active);
                    }}
                    disabled={togglingIds.has(rule.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.is_active ? "bg-emerald-500" : "bg-slate-300"
                    } ${togglingIds.has(rule.id) ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rule.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Manual Event Modal */}
      {showEventModal && (
        <ManualRewardEventModal
          onClose={() => setShowEventModal(false)}
          onSuccess={() => {
            setShowEventModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
