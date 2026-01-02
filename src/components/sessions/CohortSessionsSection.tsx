"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AddSessionModal } from "@/components/sessions/AddSessionModal";
import { SessionsApi, SessionStatus, type Session } from "@/lib/sessions";
import { toast } from "sonner";

type CohortSessionsSectionProps = {
    cohortId: string;
    cohortTimezone?: string;
    cohortLocationName?: string;
};

export function CohortSessionsSection({
    cohortId,
    cohortTimezone,
    cohortLocationName
}: CohortSessionsSectionProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const loadSessions = async () => {
        try {
            const data = await SessionsApi.getCohortSessions(cohortId);
            // Sort by starts_at
            data.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions", error);
            toast.error("Failed to load sessions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cohortId) {
            loadSessions();
        }
    }, [cohortId]);

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm("Are you sure you want to delete this session?")) return;
        try {
            await SessionsApi.deleteSession(sessionId);
            toast.success("Session deleted");
            loadSessions();
        } catch (error) {
            console.error("Failed to delete session", error);
            toast.error("Failed to delete session");
        }
    };

    const handleStatusChange = async (sessionId: string, newStatus: SessionStatus) => {
        try {
            await SessionsApi.updateSession(sessionId, { status: newStatus });
            toast.success("Session status updated");
            loadSessions();
        } catch (error) {
            console.error("Failed to update session", error);
            toast.error("Failed to update session");
        }
    };

    const getStatusBadgeVariant = (status: SessionStatus) => {
        switch (status) {
            case SessionStatus.SCHEDULED: return "default";
            case SessionStatus.IN_PROGRESS: return "warning";
            case SessionStatus.COMPLETED: return "success";
            case SessionStatus.CANCELLED: return "danger";
            default: return "default";
        }
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return {
            date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
            time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="text-center text-slate-500">Loading sessions...</div>
            </Card>
        );
    }

    return (
        <>
            <Card className="overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
                        <p className="text-sm text-slate-600">Manage class sessions for this cohort</p>
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        + Add Session
                    </Button>
                </div>

                {sessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <p className="mb-4">No sessions scheduled yet.</p>
                        <Button onClick={() => setIsAddModalOpen(true)} variant="outline">
                            Add First Session
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sessions.map((session) => {
                            const { date, time } = formatDateTime(session.starts_at);
                            const endTime = formatDateTime(session.ends_at).time;

                            return (
                                <div
                                    key={session.id}
                                    className="p-4 hover:bg-slate-50/50 transition-colors flex items-center gap-4"
                                >
                                    {/* Week/Date column */}
                                    <div className="w-24 flex-shrink-0">
                                        <div className="text-xs font-medium text-slate-500 uppercase">
                                            Week {session.week_number || "—"}
                                        </div>
                                        <div className="text-sm font-semibold text-slate-900">{date}</div>
                                    </div>

                                    {/* Time column */}
                                    <div className="w-24 flex-shrink-0">
                                        <div className="text-sm text-slate-700">
                                            {time} – {endTime}
                                        </div>
                                    </div>

                                    {/* Title/Lesson column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-900 truncate">
                                            {session.lesson_title || session.title}
                                        </div>
                                        {session.location_name && (
                                            <div className="text-xs text-slate-500 truncate">
                                                📍 {session.location_name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Capacity column */}
                                    <div className="w-20 text-center flex-shrink-0">
                                        <div className="text-xs text-slate-500">Capacity</div>
                                        <div className="text-sm font-medium text-slate-700">
                                            {session.capacity}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="w-28 flex-shrink-0">
                                        <select
                                            value={session.status}
                                            onChange={(e) => handleStatusChange(session.id, e.target.value as SessionStatus)}
                                            className="w-full text-xs rounded border border-slate-200 px-2 py-1 focus:outline-none focus:border-cyan-500"
                                        >
                                            <option value={SessionStatus.SCHEDULED}>Scheduled</option>
                                            <option value={SessionStatus.IN_PROGRESS}>In Progress</option>
                                            <option value={SessionStatus.COMPLETED}>Completed</option>
                                            <option value={SessionStatus.CANCELLED}>Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                            title="Delete session"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <AddSessionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={(newSession) => {
                    toast.success("Session added");
                    loadSessions();
                }}
                cohortId={cohortId}
                cohortTimezone={cohortTimezone}
                cohortLocationName={cohortLocationName}
            />
        </>
    );
}
