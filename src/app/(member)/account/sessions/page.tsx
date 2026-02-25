"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { Session, SessionsApi } from "@/lib/sessions";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Users,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Convert slugs like "rowe_park_pool" → "Rowe Park Pool" */
function formatLocationName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type AttendanceRecord = {
  session_id: string;
  status?: string;
};

export default function MyBookingsPage() {
  const [bookedSessions, setBookedSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [allSessions, attendanceData] = await Promise.all([
        SessionsApi.listSessions(),
        apiGet<AttendanceRecord[]>("/api/v1/attendance/me", {
          auth: true,
        }).catch(() => [] as AttendanceRecord[]),
      ]);

      // Build set of actively booked session IDs (exclude cancelled / no-show)
      const bookedIds = new Set<string>();
      for (const record of attendanceData) {
        if (!record.session_id) continue;
        const status = String(record.status || "").toLowerCase();
        if (status === "cancelled" || status === "canceled" || status === "no_show") {
          continue;
        }
        bookedIds.add(record.session_id);
      }

      // Keep only future sessions that this member has booked
      const now = new Date();
      const myUpcoming = allSessions.filter(
        (s) => bookedIds.has(s.id) && new Date(s.starts_at) > now,
      );

      // Sort ascending by start date
      myUpcoming.sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );

      setBookedSessions(myUpcoming);
    } catch (error) {
      console.error("Failed to load bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-slate-600 mt-1">
            Your upcoming confirmed session reservations.
          </p>
        </div>
        <Link href="/sessions">
          <Button variant="secondary" className="flex items-center gap-2 shrink-0">
            Browse Sessions
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {bookedSessions.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <Waves className="mx-auto h-12 w-12 text-slate-300" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900">No upcoming bookings</h2>
            <p className="mt-2 text-slate-500">
              You haven&apos;t reserved a spot in any upcoming sessions yet.
            </p>
          </div>
          <Link href="/sessions">
            <Button className="inline-flex items-center gap-2">
              Browse Upcoming Sessions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {bookedSessions.length} upcoming{" "}
            {bookedSessions.length === 1 ? "session" : "sessions"} booked
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookedSessions.map((session) => {
              const startDate = new Date(session.starts_at);
              const endDate = new Date(session.ends_at);

              return (
                <div
                  key={session.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all"
                >
                  {/* Confirmed accent bar */}
                  <div className="h-1.5 bg-emerald-500" />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Confirmed badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CalendarCheck className="h-3.5 w-3.5" />
                        Confirmed
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-slate-900">
                      {session.title}
                    </h3>
                    {session.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {session.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {startDate.toLocaleDateString("en-NG", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {startDate.toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {endDate.toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {session.location_name && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>{formatLocationName(session.location_name)}</span>
                        </div>
                      )}
                      {session.capacity > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>{session.capacity} spots</span>
                        </div>
                      )}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* CTA */}
                    <div className="mt-4">
                      <Link href={`/sessions/${session.id}/book`}>
                        <Button className="w-full" size="sm" variant="secondary">
                          View Booking
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer CTA */}
          <div className="text-center pt-2">
            <Link
              href="/sessions"
              className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Browse more upcoming sessions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
