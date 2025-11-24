"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";

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
  // Add other fields as needed
}

interface Announcement {
  id: string;
  title: string;
  published_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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
        const statsRes = await fetch("/api/v1/admin/dashboard-stats", { headers });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch Sessions (for list)
        const sessionsRes = await fetch("/api/v1/sessions/", { headers });
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
        const announcementsRes = await fetch("/api/v1/communications/announcements/", { headers });
        if (announcementsRes.ok) {
          const announcementsData = await announcementsRes.json();
          setAnnouncements(announcementsData.slice(0, 5));
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

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin</p>
        <h1 className="text-4xl font-bold text-slate-900">Dashboard overview</h1>
        <p className="text-sm text-slate-600">Overview of community activity.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total members</p>
          <p className="text-2xl font-semibold text-slate-900">{stats?.total_members || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Active members</p>
          <p className="text-2xl font-semibold text-slate-900">{stats?.active_members || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Upcoming sessions</p>
          <p className="text-2xl font-semibold text-slate-900">{stats?.upcoming_sessions_count || 0}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming sessions.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {sessions.map((session) => (
                <li key={session.id} className="flex justify-between">
                  <span>{session.title || "Untitled Session"}</span>
                  <span>
                    {new Date(session.start_time).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No recent announcements.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="flex justify-between">
                  <span>{announcement.title}</span>
                  <span>{new Date(announcement.published_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
