"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type RewardRuleDetail = {
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
  // Extended stats (detail response)
  total_grants: number;
  total_bubbles_distributed: number;
};

// ============================================================================
// Component
// ============================================================================

const PERIOD_OPTIONS = [
  { value: "", label: "None" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export default function AdminRewardRuleDetailPage() {
  const params = useParams();
  const ruleId = params.ruleId as string;

  const [rule, setRule] = useState<RewardRuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [description, setDescription] = useState("");
  const [rewardDescriptionTemplate, setRewardDescriptionTemplate] = useState("");
  const [bubbleAmount, setBubbleAmount] = useState(0);
  const [maxLifetime, setMaxLifetime] = useState<string>("");
  const [maxPeriod, setMaxPeriod] = useState<string>("");
  const [period, setPeriod] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const loadRule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<RewardRuleDetail>(`/api/v1/admin/wallet/rewards/rules/${ruleId}`, {
        auth: true,
      });
      setRule(data);
      setDescription(data.description || "");
      setRewardDescriptionTemplate(data.reward_description_template || "");
      setBubbleAmount(data.reward_bubbles);
      setMaxLifetime(
        data.max_per_member_lifetime != null ? String(data.max_per_member_lifetime) : ""
      );
      setMaxPeriod(
        data.max_per_member_per_period != null ? String(data.max_per_member_per_period) : ""
      );
      setPeriod(data.period || "");
      setIsActive(data.is_active);
      setRequiresConfirmation(data.requires_admin_confirmation);
    } catch (e) {
      console.error("Failed to load rule:", e);
      toast.error("Failed to load rule details");
    } finally {
      setLoading(false);
    }
  }, [ruleId]);

  useEffect(() => {
    loadRule();
  }, [loadRule]);

  const handleSave = async () => {
    if (!rule) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (description !== (rule.description || "")) payload.description = description;
      if (rewardDescriptionTemplate !== (rule.reward_description_template || "")) {
        payload.reward_description_template = rewardDescriptionTemplate;
      }
      if (bubbleAmount !== rule.reward_bubbles) payload.reward_bubbles = bubbleAmount;

      const newMaxLifetime = maxLifetime !== "" ? Number(maxLifetime) : null;
      if (newMaxLifetime !== rule.max_per_member_lifetime)
        payload.max_per_member_lifetime = newMaxLifetime;

      const newMaxPeriod = maxPeriod !== "" ? Number(maxPeriod) : null;
      if (newMaxPeriod !== rule.max_per_member_per_period)
        payload.max_per_member_per_period = newMaxPeriod;

      const newPeriod = period || null;
      if (newPeriod !== rule.period) payload.period = newPeriod;

      if (isActive !== rule.is_active) payload.is_active = isActive;
      if (requiresConfirmation !== rule.requires_admin_confirmation)
        payload.requires_admin_confirmation = requiresConfirmation;

      if (Object.keys(payload).length === 0) {
        toast("No changes to save");
        setSaving(false);
        return;
      }

      await apiPatch(`/api/v1/admin/wallet/rewards/rules/${ruleId}`, payload, { auth: true });
      toast.success("Rule updated successfully");
      await loadRule();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage text="Loading rule details..." />;
  }

  if (!rule) {
    return (
      <div className="space-y-4">
        <Link href="/admin/wallet/rewards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <p className="text-slate-600">Rule not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/wallet/rewards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{rule.display_name}</h1>
          <p className="text-sm text-slate-500">{rule.rule_name}</p>
        </div>
      </div>

      {/* Rule Info (non-editable) */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Rule Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Event Type</p>
            <p className="font-medium text-slate-900">{rule.event_type}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Category</p>
            <Badge variant="secondary">{rule.category}</Badge>
          </div>
          <div>
            <p className="text-xs text-slate-500">Priority</p>
            <p className="font-medium text-slate-900">{rule.priority}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="font-medium text-slate-900">{formatDate(rule.created_at)}</p>
          </div>
        </div>
      </Card>

      {/* Editable Fields */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Rule Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule rewards and when it triggers..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reward Description Template
            </label>
            <textarea
              value={rewardDescriptionTemplate}
              onChange={(e) => setRewardDescriptionTemplate(e.target.value)}
              placeholder="e.g. Referral reward - {referee_name} joined ({amount} Bubbles)"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              This controls the text shown in member reward history. Supported placeholders include{" "}
              <span className="font-mono">{"{amount}"}</span> and event fields like{" "}
              <span className="font-mono">{"{referrer_name}"}</span>,{" "}
              <span className="font-mono">{"{referee_name}"}</span>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bubble Amount</label>
            <input
              type="number"
              value={bubbleAmount}
              onChange={(e) => setBubbleAmount(Number(e.target.value))}
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Max Per Member (Lifetime)
            </label>
            <input
              type="number"
              value={maxLifetime}
              onChange={(e) => setMaxLifetime(e.target.value)}
              placeholder="No limit"
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Max Per Member (Per Period)
            </label>
            <input
              type="number"
              value={maxPeriod}
              onChange={(e) => setMaxPeriod(e.target.value)}
              placeholder="No limit"
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mt-4">
          <label className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setRequiresConfirmation(!requiresConfirmation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                requiresConfirmation ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  requiresConfirmation ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            Requires Admin Confirmation
          </label>
        </div>

        <div className="mt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Card>

      {/* Usage Stats */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Usage Statistics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total Grants</p>
            <p className="text-lg font-semibold text-slate-900">
              {(rule.total_grants ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Total Bubbles Distributed</p>
            <p className="text-lg font-semibold text-emerald-600">
              {(rule.total_bubbles_distributed ?? 0).toLocaleString()} 🫧
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
