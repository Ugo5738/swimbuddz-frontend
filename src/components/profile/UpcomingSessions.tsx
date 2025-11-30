"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getSessions, Session } from "@/lib/sessions";

export function UpcomingSessions() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getSessions()
            .then((data) => {
                // Filter for future sessions only
                const futureSessions = data
                    .filter(session => new Date(session.date) >= new Date())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(0, 3); // Show next 3 sessions
                setSessions(futureSessions);
            })
            .catch((err) => {
                console.error("Failed to load sessions:", err);
                setError("Could not load upcoming sessions.");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="text-sm text-slate-500">Loading upcoming sessions...</div>;
    }

    if (error) {
        return <div className="text-sm text-red-500">{error}</div>;
    }

    if (sessions.length === 0) {
        return (
            <div className="text-sm text-slate-600">
                No upcoming sessions scheduled.{" "}
                <Link href="/sessions-and-events" className="text-cyan-600 hover:underline">
                    View full calendar
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div>
                        <p className="font-semibold text-slate-900">{session.title}</p>
                        <p className="text-xs text-slate-500">
                            {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {session.startTime}
                        </p>
                    </div>
                    <Link href={`/sessions/${session.id}/sign-in`}>
                        <Button size="sm" variant="outline">Sign In</Button>
                    </Link>
                </div>
            ))}
            <div className="text-center">
                <Link href="/sessions-and-events" className="text-xs font-medium text-cyan-600 hover:underline">
                    View all sessions &rarr;
                </Link>
            </div>
        </div>
    );
}
