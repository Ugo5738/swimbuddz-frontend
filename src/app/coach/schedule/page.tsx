"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  getMyCoachSessions,
  type CoachSession,
  type SessionStatus,
  type SessionType,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "list" | "week";

export default function CoachSchedulePage() {
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getMyCoachSessions();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load sessions", err);
        setError("Failed to load your schedule. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, CoachSession[]> = {};

    sessions.forEach((session) => {
      const dateKey = session.starts_at.split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });

    // Sort sessions within each day
    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    });

    return grouped;
  }, [sessions]);

  // Get sorted dates
  const sortedDates = useMemo(() => {
    return Object.keys(sessionsByDate).sort();
  }, [sessionsByDate]);

  // Filter to upcoming sessions only
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => new Date(s.starts_at) >= now);
  }, [sessions]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

    return {
      total: sessions.length,
      upcoming: upcomingSessions.length,
      thisWeek: upcomingSessions.filter(
        (s) => new Date(s.starts_at) <= thisWeekEnd,
      ).length,
      completed: sessions.filter((s) => s.status === "completed").length,
    };
  }, [sessions, upcomingSessions]);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(newDate);
  };

  if (loading) {
    return <LoadingCard text="Loading your schedule..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Schedule</h1>
          <p className="text-slate-600 mt-1">
            View your upcoming sessions and cohort classes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={viewMode === "week" ? "primary" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Week
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Sessions</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Upcoming</p>
          <p className="text-2xl font-bold text-emerald-600">
            {stats.upcoming}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">This Week</p>
          <p className="text-2xl font-bold text-blue-600">{stats.thisWeek}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-slate-600">{stats.completed}</p>
        </Card>
      </div>

      {/* Content */}
      {sessions.length === 0 ? (
        <Card className="p-6">
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 font-medium">No sessions scheduled</p>
            <p className="text-sm text-slate-500 mt-1">
              Sessions will appear here once they are scheduled for your
              cohorts.
            </p>
          </div>
        </Card>
      ) : viewMode === "list" ? (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                {formatDateHeader(dateKey)}
              </h2>
              <div className="space-y-3">
                {sessionsByDate[dateKey].map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-slate-900">
              Week of {formatDate(currentDate.toISOString())}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week Grid */}
          <WeekView sessions={sessions} weekStart={getWeekStart(currentDate)} />
        </Card>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: CoachSession }) {
  const startTime = new Date(session.starts_at);
  const endTime = new Date(session.ends_at);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusVariant = (
    status: SessionStatus,
  ): "success" | "warning" | "info" | "default" | "danger" => {
    switch (status) {
      case "scheduled":
        return "info";
      case "in_progress":
        return "warning";
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type: SessionType): string => {
    switch (type) {
      case "cohort_class":
        return "Cohort Class";
      case "one_on_one":
        return "1-on-1";
      case "group_booking":
        return "Group";
      case "club":
        return "Club";
      case "community":
        return "Community";
      case "event":
        return "Event";
      default:
        return type;
    }
  };

  const isPast = new Date(session.ends_at) < new Date();

  return (
    <Card className={`p-4 ${isPast ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">{session.title}</h3>
            <Badge variant={getStatusVariant(session.status)}>
              {session.status}
            </Badge>
            <Badge variant="default">
              {getTypeLabel(session.session_type)}
            </Badge>
          </div>
          {session.lesson_title && (
            <p className="text-sm text-emerald-700 font-medium">
              {session.week_number && `Week ${session.week_number}: `}
              {session.lesson_title}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatTime(startTime)} - {formatTime(endTime)}
            </span>
            {(session.location_name || session.location) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {session.location_name || session.location?.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {session.cohort_id && (
            <Link href={`/coach/cohorts/${session.cohort_id}`}>
              <Button size="sm" variant="outline">
                View Cohort
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function WeekView({
  sessions,
  weekStart,
}: {
  sessions: CoachSession[];
  weekStart: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getSessionsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return sessions.filter((s) => s.starts_at.split("T")[0] === dateStr);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, index) => {
        const daySessions = getSessionsForDay(day);
        const today = isToday(day);

        return (
          <div key={index} className="min-h-[120px]">
            <div
              className={`text-center p-2 rounded-t-lg ${
                today ? "bg-emerald-100" : "bg-slate-100"
              }`}
            >
              <p className="text-xs text-slate-500">{dayNames[index]}</p>
              <p
                className={`text-lg font-semibold ${
                  today ? "text-emerald-700" : "text-slate-700"
                }`}
              >
                {day.getDate()}
              </p>
            </div>
            <div className="border border-t-0 border-slate-200 rounded-b-lg p-1 min-h-[80px]">
              {daySessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No sessions
                </p>
              ) : (
                <div className="space-y-1">
                  {daySessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-emerald-50 border border-emerald-200 rounded p-1 text-xs"
                    >
                      <p className="font-medium text-emerald-800 truncate">
                        {session.title}
                      </p>
                      <p className="text-emerald-600">
                        {formatTime(session.starts_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}
