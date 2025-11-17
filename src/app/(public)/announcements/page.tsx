import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockAnnouncements } from "./data";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Updates</p>
        <h1 className="text-4xl font-bold text-slate-900">Announcements keep everyone aligned.</h1>
        <p className="text-lg text-slate-600">
          Official updates from SwimBuddz admins: weather shuffles, new sessions, policy reminders, and more.
        </p>
      </header>
      <div className="space-y-4">
        {mockAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Badge variant="info" className="capitalize">
                {announcement.category}
              </Badge>
              <time dateTime={announcement.date}>{formatDate(announcement.date)}</time>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">{announcement.title}</h2>
              <p className="text-sm text-slate-600">{announcement.summary}</p>
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
    </div>
  );
}
