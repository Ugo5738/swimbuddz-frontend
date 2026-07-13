"use client";

import { Button } from "@/components/ui/Button";
import { Session, SessionsApi } from "@/lib/sessions";
import Link from "next/link";
import { useEffect, useState } from "react";

export function UpcomingSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await SessionsApi.listSessions({ auth: true });
        const futureSessions = data
          .filter(
            (session: Session) =>
              new Date(session.starts_at) >= new Date() &&
              session.access?.bookable === true,
          )
          .sort(
            (a: Session, b: Session) =>
              new Date(a.starts_at).getTime() -
              new Date(b.starts_at).getTime(),
          )
          .slice(0, 3);
        setSessions(futureSessions);
      } catch (err) {
        console.error("Failed to load sessions:", err);
        setError("Could not load upcoming sessions.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading upcoming sessions...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-sm text-slate-600">
        No bookable upcoming sessions.{" "}
        <Link href="/sessions" className="text-cyan-600 hover:underline">
          View full calendar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
        >
          <div>
            <p className="font-semibold text-slate-900">{session.title}</p>
            <p className="text-xs text-slate-500">
              {new Date(session.starts_at).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              • {formatTime(session.starts_at)}
            </p>
          </div>
          <Link href={`/sessions/${session.id}/book`}>
            <Button size="sm" variant="outline">
              Book
            </Button>
          </Link>
        </div>
      ))}
      <div className="text-center">
        <Link href="/sessions" className="text-xs font-medium text-cyan-600 hover:underline">
          View all sessions &rarr;
        </Link>
      </div>
    </div>
  );
}
