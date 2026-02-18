"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { formatAnnouncementCategory } from "@/lib/communications";
import { format } from "date-fns";
import { Pin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await apiGet<Announcement[]>(
        "/api/v1/communications/announcements",
        { auth: true },
      );
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      setError("Unable to load announcements. Try again soon.");
    } finally {
      setLoading(false);
    }
  };

  // Truncate body for summary
  const getSummary = (body: string, maxLength = 150) => {
    if (body.length <= maxLength) return body;
    return body.slice(0, maxLength).trim() + "...";
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Updates
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          Announcements keep everyone aligned.
        </h1>
        <p className="text-lg text-slate-600">
          Official updates from SwimBuddz admins: weather shuffles, new
          sessions, policy reminders, and more.
        </p>
      </header>
      <section aria-live="polite">
        {loading ? (
          <LoadingCard text="Loading announcements..." />
        ) : error ? (
          <Alert variant="error" title="Error loading announcements">
            {error}
          </Alert>
        ) : announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600">
              No announcements yet. Check back soon!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <Badge variant="info" className="capitalize">
                    {formatAnnouncementCategory(announcement.category)}
                  </Badge>
                  {announcement.is_pinned && (
                    <Badge
                      variant="warning"
                      className="flex items-center gap-1"
                    >
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                  <time dateTime={announcement.published_at}>
                    {format(new Date(announcement.published_at), "MMM d, yyyy")}
                  </time>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {announcement.title}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {getSummary(announcement.body)}
                  </p>
                </div>
                <Link
                  href={`/announcements/${announcement.id}`}
                  className="inline-flex text-sm font-semibold text-cyan-700 hover:underline"
                >
                  Read update &rarr;
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
