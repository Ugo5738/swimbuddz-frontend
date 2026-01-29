"use client";

import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarDays,
  Clock,
  GraduationCap,
  Megaphone,
  TrendingUp,
  UserCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  total_members: number;
  active_members: number;
  approved_members: number;
  pending_approvals: number;
  upcoming_sessions_count: number;
  recent_announcements_count: number;
}

interface Session {
  id: string;
  title: string;
  starts_at: string;  // API returns starts_at, not start_time
  location?: { address?: string };
}

interface Announcement {
  id: string;
  title: string;
  published_at: string;
}

interface Enrollment {
  id: string;
  member?: { full_name?: string };
  cohort?: {
    name?: string;
    program?: { name?: string };
  };
  status: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          setError("Not authenticated");
          setIsLoading(false);
          return;
        }

        const headers = {
          "Authorization": `Bearer ${token}`
        };

        // Fetch Stats
        const statsRes = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard-stats`, { headers });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch Sessions (for list)
        const sessionsRes = await fetch(`${API_BASE_URL}/api/v1/sessions/`, { headers });
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          // Filter for upcoming and take top 5
          const now = new Date();
          const upcoming = sessionsData
            .filter((s: any) => new Date(s.starts_at) > now)
            .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
            .slice(0, 5);
          setSessions(upcoming);
        }

        // Fetch Announcements (for list)
        const announcementsRes = await fetch(`${API_BASE_URL}/api/v1/communications/announcements/`, { headers });
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          setAnnouncements(announcementsData.slice(0, 5));
        }

        // Fetch Recent Enrollments
        const enrollmentsRes = await fetch(`${API_BASE_URL}/api/v1/academy/enrollments/`, { headers });
        if (enrollmentsRes.ok) {
          const enrollmentsData = await enrollmentsRes.json();
          setRecentEnrollments(enrollmentsData.slice(0, 5));
        }

      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-cyan-600">Admin Portal</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-slate-600">Welcome back! Here's what's happening with SwimBuddz.</p>
      </header>

      {/* Stats Grid - 2 columns on mobile, then scale up */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-5">
        {/* Pending Approvals - Highlighted - spans full width on mobile */}
        <Card className="col-span-2 lg:col-span-1 overflow-hidden border-l-4 border-l-amber-500 transition-shadow hover:shadow-lg bg-amber-50/50">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-amber-700">Pending Approvals</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-900">{stats?.pending_approvals || 0}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-2 sm:p-3">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
          </div>
          {(stats?.pending_approvals || 0) > 0 ? (
            <Link
              href="/admin/members?filter=pending"
              className="mt-3 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Review now <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          ) : (
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-amber-600">All caught up!</p>
          )}
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-cyan-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Total Members</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats?.total_members || 0}</p>
            </div>
            <div className="rounded-full bg-cyan-100 p-2 sm:p-3">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-600" />
            </div>
          </div>
          <Link
            href="/admin/members"
            className="mt-3 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View all <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Approved</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats?.approved_members || 0}</p>
            </div>
            <div className="rounded-full bg-green-100 p-2 sm:p-3">
              <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Active</span>
          </div>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-purple-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Sessions</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats?.upcoming_sessions_count || 0}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-2 sm:p-3">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
          </div>
          <Link
            href="/admin/sessions"
            className="mt-3 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Manage <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-orange-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Announcements</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats?.recent_announcements_count || 0}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-2 sm:p-3">
              <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
          </div>
          <Link
            href="/admin/announcements"
            className="mt-3 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            View all <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card className="flex flex-col">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Upcoming Sessions</h2>
            </div>
            <Link
              href="/admin/sessions"
              className="text-xs sm:text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View all
            </Link>
          </div>
          <div className="flex-1">
            {sessions.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">No upcoming sessions scheduled</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex items-start justify-between rounded-lg border border-slate-200 p-3 transition-all hover:border-purple-300 hover:bg-purple-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {session.title || "Untitled Session"}
                      </p>
                      {session.location?.address && (
                        <p className="text-xs text-slate-500 truncate">{session.location.address}</p>
                      )}
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(session.starts_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric"
                        })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(session.starts_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Recent Announcements */}
        <Card className="flex flex-col">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Recent Announcements</h2>
            </div>
            <Link
              href="/admin/announcements"
              className="text-xs sm:text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View all
            </Link>
          </div>
          <div className="flex-1">
            {announcements.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">No announcements published</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {announcements.map((announcement) => (
                  <li
                    key={announcement.id}
                    className="flex items-start justify-between rounded-lg border border-slate-200 p-3 transition-all hover:border-orange-300 hover:bg-orange-50/50"
                  >
                    <p className="min-w-0 flex-1 font-medium text-slate-900 truncate">
                      {announcement.title}
                    </p>
                    <span className="ml-3 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(announcement.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Recent Academy Enrollments */}
        <Card className="flex flex-col lg:col-span-2">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Recent Enrollments</h2>
            </div>
            <Link
              href="/admin/academy"
              className="text-xs sm:text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              Manage
            </Link>
          </div>
          <div className="flex-1">
            {recentEnrollments.length === 0 ? (
              <div className="flex h-24 sm:h-32 items-center justify-center rounded-lg bg-slate-50">
                <p className="text-xs sm:text-sm text-slate-500">No recent enrollments</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="divide-y divide-slate-100 sm:hidden">
                  {recentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm truncate">
                            {enrollment.member?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {enrollment.cohort?.program?.name || "N/A"} • {enrollment.cohort?.name || "N/A"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${enrollment.status === "active"
                            ? "bg-green-100 text-green-700"
                            : enrollment.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-700"
                            }`}
                        >
                          {enrollment.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(enrollment.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-sm text-slate-600">
                        <th className="pb-3 font-medium">Member</th>
                        <th className="pb-3 font-medium">Program</th>
                        <th className="pb-3 font-medium">Cohort</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentEnrollments.map((enrollment) => (
                        <tr key={enrollment.id} className="text-sm hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-900">
                            {enrollment.member?.full_name || "Unknown"}
                          </td>
                          <td className="py-3 text-slate-600">
                            {enrollment.cohort?.program?.name || "N/A"}
                          </td>
                          <td className="py-3 text-slate-600">
                            {enrollment.cohort?.name || "N/A"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${enrollment.status === "active"
                                ? "bg-green-100 text-green-700"
                                : enrollment.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-slate-100 text-slate-700"
                                }`}
                            >
                              {enrollment.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500">
                            {new Date(enrollment.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
