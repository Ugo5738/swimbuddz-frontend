"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_OPTIONS = [
  { value: "acquisition", label: "Acquisition" },
  { value: "retention", label: "Retention" },
  { value: "community", label: "Community" },
  { value: "spending", label: "Spending" },
  { value: "academy", label: "Academy" },
];

const PERIOD_OPTIONS = [
  { value: "", label: "None (no periodic cap)" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

// Common event types for quick selection
const EVENT_TYPE_SUGGESTIONS = [
  "attendance.monthly_milestone",
  "attendance.streak",
  "referral.qualified",
  "referral.milestone",
  "topup.first",
  "topup.completed",
  "membership.activated",
  "membership.renewed",
  "membership.upgraded",
  "member.reactivated",
  "academy.graduated",
  "academy.milestone_passed",
  "academy.perfect_attendance",
  "volunteer.completed",
  "volunteer.peer_coaching",
  "content.published",
  "transport.ride_completed",
  "safety.report_confirmed",
  "event.shared",
  "store.first_purchase",
];

// ============================================================================
// Component
// ============================================================================

export default function CreateRewardRulePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state
  const [ruleName, setRuleName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardDescriptionTemplate, setRewardDescriptionTemplate] = useState("");
  const [eventType, setEventType] = useState("");
  const [rewardBubbles, setRewardBubbles] = useState<number>(10);
  const [category, setCategory] = useState("retention");
  const [maxLifetime, setMaxLifetime] = useState("");
  const [maxPerPeriod, setMaxPerPeriod] = useState("");
  const [period, setPeriod] = useState("");
  const [priority, setPriority] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [triggerConfig, setTriggerConfig] = useState("");

  // Auto-generate rule_name from display_name
  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    if (!ruleName || ruleName === autoRuleName(displayName)) {
      setRuleName(autoRuleName(val));
    }
  };

  const autoRuleName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const handleSubmit = async () => {
    // Validation
    if (!ruleName.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!eventType.trim()) {
      toast.error("Event type is required");
      return;
    }
    if (rewardBubbles < 1) {
      toast.error("Bubble amount must be at least 1");
      return;
    }

    // Parse trigger config JSON
    let parsedTriggerConfig = null;
    if (triggerConfig.trim()) {
      try {
        parsedTriggerConfig = JSON.parse(triggerConfig);
      } catch {
        toast.error("Trigger config must be valid JSON");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        rule_name: ruleName.trim(),
        display_name: displayName.trim(),
        event_type: eventType.trim(),
        reward_bubbles: rewardBubbles,
        category,
        is_active: isActive,
        priority,
        requires_admin_confirmation: requiresConfirmation,
      };

      if (description.trim()) payload.description = description.trim();
      if (rewardDescriptionTemplate.trim()) {
        payload.reward_description_template = rewardDescriptionTemplate.trim();
      }
      if (parsedTriggerConfig) payload.trigger_config = parsedTriggerConfig;
      if (maxLifetime) payload.max_per_member_lifetime = Number(maxLifetime);
      if (maxPerPeriod) payload.max_per_member_per_period = Number(maxPerPeriod);
      if (period) payload.period = period;

      await apiPost("/api/v1/admin/wallet/rewards/rules", payload, {
        auth: true,
      });

      toast.success("Reward rule created successfully!");
      router.push("/admin/wallet/rewards");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create reward rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/wallet/rewards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Create Reward Rule</h1>
      </div>

      {/* Basic Info */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Display Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="e.g. Monthly Attendance Bonus (8+ sessions)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Rule Name (unique identifier) *
            </label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. monthly_attendance_8"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule rewards and when it triggers..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </Card>

      {/* Trigger Configuration */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Trigger Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Event Type *</label>
            <input
              type="text"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="e.g. attendance.monthly_milestone"
              list="event-type-suggestions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <datalist id="event-type-suggestions">
              {EVENT_TYPE_SUGGESTIONS.map((et) => (
                <option key={et} value={et} />
              ))}
            </datalist>
            <p className="text-xs text-slate-400 mt-1">
              The event type that triggers this rule. Must match events emitted by services.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Trigger Conditions (JSON, optional)
            </label>
            <textarea
              value={triggerConfig}
              onChange={(e) => setTriggerConfig(e.target.value)}
              placeholder='e.g. {"min_sessions": 8, "min_amount": 200}'
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Optional conditions checked against event_data. Leave empty for no conditions.
            </p>
          </div>
        </div>
      </Card>

      {/* Reward Configuration */}
      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Reward Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bubble Amount *</label>
            <input
              type="number"
              value={rewardBubbles}
              onChange={(e) => setRewardBubbles(Number(e.target.value))}
              min={1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Higher priority rules are evaluated first.
            </p>
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
              min={1}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Max Per Member (Per Period)
            </label>
            <input
              type="number"
              value={maxPerPeriod}
              onChange={(e) => setMaxPerPeriod(e.target.value)}
              placeholder="No limit"
              min={1}
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
              Optional template used in wallet/reward history. You can use{" "}
              <span className="font-mono">{"{amount}"}</span> plus event fields like{" "}
              <span className="font-mono">{"{referrer_name}"}</span> or{" "}
              <span className="font-mono">{"{referee_name}"}</span>.
            </p>
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
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          <Plus className="h-4 w-4 mr-1.5" />
          {saving ? "Creating..." : "Create Rule"}
        </Button>
        <Link href="/admin/wallet/rewards">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}
