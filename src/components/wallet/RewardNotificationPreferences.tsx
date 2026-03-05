"use client";

import { Card } from "@/components/ui/Card";
import { apiGet, apiPatch } from "@/lib/api";
import { Award, Bell, Trophy, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type RewardNotifPreferences = {
  notify_reward_earned: boolean;
  notify_referral_qualified: boolean;
  notify_ambassador_milestone: boolean;
  notify_streak_milestone: boolean;
  preferred_channel: string;
};

// ============================================================================
// Toggle Component
// ============================================================================

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "bg-cyan-600" : "bg-slate-300"}`}
      disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ============================================================================
// Preference Row
// ============================================================================

function PrefRow({
  icon,
  title,
  description,
  enabled,
  onChange,
  saving,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">{icon}</div>
        <div>
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} disabled={saving} />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RewardNotificationPreferences() {
  const [prefs, setPrefs] = useState<RewardNotifPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    try {
      const data = await apiGet<RewardNotifPreferences>(
        "/api/v1/wallet/notifications/preferences",
        { auth: true }
      );
      setPrefs(data);
    } catch (e) {
      console.error("Failed to load reward notification preferences:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const updatePref = async (key: keyof RewardNotifPreferences, value: boolean) => {
    if (!prefs) return;
    setSaving(true);

    // Optimistic update
    const prev = { ...prefs };
    setPrefs({ ...prefs, [key]: value });

    try {
      await apiPatch("/api/v1/wallet/notifications/preferences", { [key]: value }, { auth: true });
    } catch {
      // Revert on error
      setPrefs(prev);
      toast.error("Failed to update preference");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Reward Notifications</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      </Card>
    );
  }

  if (!prefs) {
    return null; // Silently hide if endpoint not available
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <Award className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-slate-900">Reward Notifications</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">Notifications appear in-app.</p>

      <div className="space-y-0">
        <PrefRow
          icon={<Bell className="h-4 w-4" />}
          title="Reward Earned"
          description="Notify when you earn Bubbles from rewards"
          enabled={prefs.notify_reward_earned}
          onChange={(v) => updatePref("notify_reward_earned", v)}
          saving={saving}
        />
        <PrefRow
          icon={<Users className="h-4 w-4" />}
          title="Referral Qualified"
          description="Notify when a referral qualifies for reward"
          enabled={prefs.notify_referral_qualified}
          onChange={(v) => updatePref("notify_referral_qualified", v)}
          saving={saving}
        />
        <PrefRow
          icon={<Trophy className="h-4 w-4" />}
          title="Ambassador Milestone"
          description="Notify when you reach ambassador status"
          enabled={prefs.notify_ambassador_milestone}
          onChange={(v) => updatePref("notify_ambassador_milestone", v)}
          saving={saving}
        />
        <PrefRow
          icon={<Zap className="h-4 w-4" />}
          title="Streak Milestone"
          description="Notify on attendance streak milestones"
          enabled={prefs.notify_streak_milestone}
          onChange={(v) => updatePref("notify_streak_milestone", v)}
          saving={saving}
        />
      </div>
    </Card>
  );
}
