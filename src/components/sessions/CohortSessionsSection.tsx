"use client";

import { AddSessionModal } from "@/components/sessions/AddSessionModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SessionsApi, SessionStatus, type Session } from "@/lib/sessions";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CohortSessionsSectionProps = {
  cohortId: string;
  cohortTimezone?: string;
  cohortLocationName?: string;
};

export function CohortSessionsSection({
  cohortId,
  cohortTimezone,
  cohortLocationName,
}: CohortSessionsSectionProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadSessions = async () => {
    try {
      const data = await SessionsApi.getCohortSessions(cohortId, {
        includeDrafts: true,
      });
      // Sort by starts_at
      data.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
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

  const handleStatusChange = async (
    sessionId: string,
    newStatus: SessionStatus,
  ) => {
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
      case SessionStatus.SCHEDULED:
        return "default";
      case SessionStatus.IN_PROGRESS:
        return "warning";
      case SessionStatus.COMPLETED:
        return "success";
      case SessionStatus.CANCELLED:
        return "danger";
      default:
        return "default";
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
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
      <Card className="overflow-hidden !p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Sessions</h2>
            <p className="text-sm text-slate-600">
              Manage class sessions for this cohort
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0">
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
                  className="p-3 sm:p-4 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Desktop layout */}
                  <div className="hidden sm:flex items-center gap-4">
                    <div className="w-24 flex-shrink-0">
                      <div className="text-xs font-medium text-slate-500 uppercase">
                        Week {session.week_number || "—"}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {date}
                      </div>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <div className="text-sm text-slate-700">
                        {time} – {endTime}
                      </div>
                    </div>
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
                    <div className="w-20 text-center flex-shrink-0">
                      <div className="text-xs text-slate-500">Capacity</div>
                      <div className="text-sm font-medium text-slate-700">
                        {session.capacity}
                      </div>
                    </div>
                    <div className="w-28 flex-shrink-0">
                      <select
                        value={session.status}
                        onChange={(e) =>
                          handleStatusChange(
                            session.id,
                            e.target.value as SessionStatus,
                          )
                        }
                        className="w-full text-xs rounded border border-slate-200 px-2 py-1 focus:outline-none focus:border-cyan-500"
                      >
                        <option value={SessionStatus.DRAFT}>Draft</option>
                        <option value={SessionStatus.SCHEDULED}>
                          Scheduled
                        </option>
                        <option value={SessionStatus.IN_PROGRESS}>
                          In Progress
                        </option>
                        <option value={SessionStatus.COMPLETED}>
                          Completed
                        </option>
                        <option value={SessionStatus.CANCELLED}>
                          Cancelled
                        </option>
                      </select>
                    </div>
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

                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 text-sm truncate">
                          {session.lesson_title || session.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Wk {session.week_number || "—"} · {date} · {time}–
                          {endTime}
                        </div>
                        {session.location_name && (
                          <div className="text-xs text-slate-400 truncate">
                            📍 {session.location_name}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-500 hover:text-red-700 text-sm flex-shrink-0 p-1"
                        title="Delete session"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={session.status}
                        onChange={(e) =>
                          handleStatusChange(
                            session.id,
                            e.target.value as SessionStatus,
                          )
                        }
                        className="text-xs rounded border border-slate-200 px-2 py-1 focus:outline-none focus:border-cyan-500"
                      >
                        <option value={SessionStatus.DRAFT}>Draft</option>
                        <option value={SessionStatus.SCHEDULED}>
                          Scheduled
                        </option>
                        <option value={SessionStatus.IN_PROGRESS}>
                          In Progress
                        </option>
                        <option value={SessionStatus.COMPLETED}>
                          Completed
                        </option>
                        <option value={SessionStatus.CANCELLED}>
                          Cancelled
                        </option>
                      </select>
                      <span className="text-xs text-slate-400">
                        {session.capacity} seats
                      </span>
                    </div>
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
