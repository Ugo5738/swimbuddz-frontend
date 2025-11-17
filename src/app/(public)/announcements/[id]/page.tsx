import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AnnouncementShareButtons } from "@/components/announcements/AnnouncementShareButtons";
import { getAnnouncementById } from "../data";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function AnnouncementDetailPage({ params }: { params: { id: string } }) {
  const announcement = getAnnouncementById(params.id);

  if (!announcement) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/announcements" className="text-sm font-semibold text-cyan-700 hover:underline">
        &larr; Back to announcements
      </Link>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <Badge variant="info" className="capitalize">
            {announcement?.category}
          </Badge>
          <time dateTime={announcement?.date}>{announcement ? formatDate(announcement.date) : null}</time>
        </div>
        <h1 className="text-4xl font-bold text-slate-900">{announcement?.title}</h1>
      </header>
      <Card className="space-y-6 text-lg text-slate-700">
        <p>{announcement?.body}</p>
        {announcement ? (
          <AnnouncementShareButtons whatsapp={announcement.whatsapp} email={announcement.email} />
        ) : null}
      </Card>
    </div>
  );
}
