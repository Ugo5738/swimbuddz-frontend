"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  Megaphone,
  GraduationCap,
  CalendarDays,
  AlertCircle,
  ArrowRight,
  Activity
} from "lucide-react";

interface DashboardStats {
  total_members: number;
  active_members: number;
  upcoming_sessions_count: number;
  recent_announcements_count: number;
}

interface Session {
  id: string;
  title: string;
  start_time: string;
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
            .filter((s: any) => new Date(s.start_time) > now)
            .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Activity className="h-5 w-5 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
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
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">Admin Portal</p>
        <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here's what's happening with SwimBuddz.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-l-4 border-l-cyan-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Total Members</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_members || 0}</p>
            </div>
            <div className="rounded-full bg-cyan-100 p-3">
              <Users className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
          <Link
            href="/admin/members"
            className="mt-4 flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Active Members</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.active_members || 0}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <span>Recently active</span>
          </div>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-purple-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Upcoming Sessions</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.upcoming_sessions_count || 0}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <Link
            href="/admin/sessions"
            className="mt-4 flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Manage sessions <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-orange-500 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600">Announcements</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.recent_announcements_count || 0}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Megaphone className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <Link
            href="/admin/announcements"
            className="mt-4 flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card className="flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Sessions</h2>
            </div>
            <Link
              href="/admin/sessions"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
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
                        {new Date(session.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric"
                        })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(session.start_time).toLocaleTimeString("en-US", {
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
            </div>
            <Link
              href="/admin/announcements"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-slate-900">Recent Academy Enrollments</h2>
            </div>
            <Link
              href="/admin/academy"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              Manage academy
            </Link>
          </div>
          <div className="flex-1">
            {recentEnrollments.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50">
                <p className="text-sm text-slate-500">No recent enrollments</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
