"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { apiEndpoints } from "@/lib/config";
import { Bell, BookOpen, Calendar, Clock, CreditCard, Loader2, Mail, Megaphone, MessageSquare, Smartphone, Users, Waves } from "lucide-react";
import { useEffect, useState } from "react";

interface NotificationPreferences {
    id: string;
    member_id: string;
    email_announcements: boolean;
    email_session_reminders: boolean;
    email_academy_updates: boolean;
    email_payment_receipts: boolean;
    email_coach_messages: boolean;
    email_marketing: boolean;
    push_announcements: boolean;
    push_session_reminders: boolean;
    push_academy_updates: boolean;
    push_coach_messages: boolean;
    weekly_digest: boolean;
    // Session subscriptions
    subscribe_community_sessions: boolean;
    subscribe_club_sessions: boolean;
    subscribe_event_sessions: boolean;
    // Reminder timing
    reminder_24h_enabled: boolean;
    reminder_3h_enabled: boolean;
    // Session digest
    weekly_session_digest: boolean;
    created_at: string;
    updated_at: string;
}

interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
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

interface PreferenceRowProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    saving?: boolean;
}

function PreferenceRow({ icon, title, description, enabled, onChange, saving }: PreferenceRowProps) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-b-0">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                    {icon}
                </div>
                <div>
                    <p className="font-medium text-slate-900">{title}</p>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
            </div>
            <Toggle enabled={enabled} onChange={onChange} disabled={saving} />
        </div>
    );
}

export default function NotificationSettingsPage() {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const response = await fetch(`${apiEndpoints.baseUrl}/api/v1/preferences/me`);
            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            } else {
                setError("Failed to load notification preferences");
            }
        } catch (err) {
            console.error("Failed to fetch preferences:", err);
            setError("Failed to load notification preferences");
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!preferences) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        // Optimistic update
        setPreferences({ ...preferences, [key]: value });

        try {
            const response = await fetch(`${apiEndpoints.baseUrl}/api/v1/preferences/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
                setSuccess("Preferences updated");
                setTimeout(() => setSuccess(null), 2000);
            } else {
                // Revert on error
                setPreferences({ ...preferences, [key]: !value });
                setError("Failed to update preferences");
            }
        } catch (err) {
            // Revert on error
            setPreferences({ ...preferences, [key]: !value });
            console.error("Failed to update preferences:", err);
            setError("Failed to update preferences");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    if (!preferences) {
        return (
            <Alert variant="error" title="Error">
                {error || "Unable to load notification preferences"}
            </Alert>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Notification Settings</h1>
                <p className="text-slate-600 mt-1">
                    Choose how you want to be notified about activity on SwimBuddz.
                </p>
            </header>

            {error && (
                <Alert variant="error" title="Error">
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success">
                    {success}
                </Alert>
            )}

            {/* Email Notifications */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-5 w-5 text-cyan-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Email Notifications</h2>
                </div>

                <div className="space-y-0">
                    <PreferenceRow
                        icon={<Megaphone className="h-4 w-4" />}
                        title="Announcements"
                        description="Important updates and news from SwimBuddz"
                        enabled={preferences.email_announcements}
                        onChange={(v) => updatePreference("email_announcements", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<Calendar className="h-4 w-4" />}
                        title="Session Reminders"
                        description="Reminders before your upcoming sessions"
                        enabled={preferences.email_session_reminders}
                        onChange={(v) => updatePreference("email_session_reminders", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<BookOpen className="h-4 w-4" />}
                        title="Academy Updates"
                        description="Progress reports and cohort information"
                        enabled={preferences.email_academy_updates}
                        onChange={(v) => updatePreference("email_academy_updates", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<CreditCard className="h-4 w-4" />}
                        title="Payment Receipts"
                        description="Confirmation emails for payments"
                        enabled={preferences.email_payment_receipts}
                        onChange={(v) => updatePreference("email_payment_receipts", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<MessageSquare className="h-4 w-4" />}
                        title="Coach Messages"
                        description="Direct messages from your coaches"
                        enabled={preferences.email_coach_messages}
                        onChange={(v) => updatePreference("email_coach_messages", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<Bell className="h-4 w-4" />}
                        title="Marketing & Tips"
                        description="Swimming tips, promotions, and community news"
                        enabled={preferences.email_marketing}
                        onChange={(v) => updatePreference("email_marketing", v)}
                        saving={saving}
                    />
                </div>
            </Card>

            {/* Session Subscriptions */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Waves className="h-5 w-5 text-cyan-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Session Alerts</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Choose which types of sessions you want to be notified about when they are published.
                </p>

                <div className="space-y-0">
                    <PreferenceRow
                        icon={<Users className="h-4 w-4" />}
                        title="Community Sessions"
                        description="Open swims and social sessions"
                        enabled={preferences.subscribe_community_sessions}
                        onChange={(v) => updatePreference("subscribe_community_sessions", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<Waves className="h-4 w-4" />}
                        title="Club Sessions"
                        description="Structured club training sessions"
                        enabled={preferences.subscribe_club_sessions}
                        onChange={(v) => updatePreference("subscribe_club_sessions", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<Calendar className="h-4 w-4" />}
                        title="Events"
                        description="Community events and meets"
                        enabled={preferences.subscribe_event_sessions}
                        onChange={(v) => updatePreference("subscribe_event_sessions", v)}
                        saving={saving}
                    />
                </div>
            </Card>

            {/* Reminder Timing */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-cyan-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Reminder Timing</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                    Control when you receive session reminders before the start time.
                </p>

                <div className="space-y-0">
                    <PreferenceRow
                        icon={<Bell className="h-4 w-4" />}
                        title="24-Hour Reminder"
                        description="Get reminded the day before a session"
                        enabled={preferences.reminder_24h_enabled}
                        onChange={(v) => updatePreference("reminder_24h_enabled", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<Bell className="h-4 w-4" />}
                        title="3-Hour Reminder"
                        description="Get reminded a few hours before a session"
                        enabled={preferences.reminder_3h_enabled}
                        onChange={(v) => updatePreference("reminder_3h_enabled", v)}
                        saving={saving}
                    />
                </div>
            </Card>

            {/* Push Notifications (Future) */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="h-5 w-5 text-cyan-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Push Notifications</h2>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Coming Soon</span>
                </div>

                <div className="space-y-0 opacity-60">
                    <PreferenceRow
                        icon={<Megaphone className="h-4 w-4" />}
                        title="Announcements"
                        description="Get notified about important updates"
                        enabled={preferences.push_announcements}
                        onChange={(v) => updatePreference("push_announcements", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<Calendar className="h-4 w-4" />}
                        title="Session Reminders"
                        description="Reminders before your sessions"
                        enabled={preferences.push_session_reminders}
                        onChange={(v) => updatePreference("push_session_reminders", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<BookOpen className="h-4 w-4" />}
                        title="Academy Updates"
                        description="Progress and cohort updates"
                        enabled={preferences.push_academy_updates}
                        onChange={(v) => updatePreference("push_academy_updates", v)}
                        saving={saving}
                    />
                    <PreferenceRow
                        icon={<MessageSquare className="h-4 w-4" />}
                        title="Coach Messages"
                        description="Messages from your coaches"
                        enabled={preferences.push_coach_messages}
                        onChange={(v) => updatePreference("push_coach_messages", v)}
                        saving={saving}
                    />
                </div>
            </Card>

            {/* Digest */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-5 w-5 text-cyan-600" />
                    <h2 className="text-lg font-semibold text-slate-900">Digest</h2>
                </div>

                <PreferenceRow
                    icon={<Calendar className="h-4 w-4" />}
                    title="Weekly Activity Digest"
                    description="A weekly summary of your activity and updates"
                    enabled={preferences.weekly_digest}
                    onChange={(v) => updatePreference("weekly_digest", v)}
                    saving={saving}
                />
                <PreferenceRow
                    icon={<Waves className="h-4 w-4" />}
                    title="Weekly Session Digest"
                    description="Every Sunday, get a preview of the week's upcoming sessions"
                    enabled={preferences.weekly_session_digest}
                    onChange={(v) => updatePreference("weekly_session_digest", v)}
                    saving={saving}
                />
            </Card>
        </div>
    );
}
