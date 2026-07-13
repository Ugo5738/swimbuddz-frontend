import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import { CalendarClock, MailCheck, Send, TimerReset } from "lucide-react";
import { useMemo } from "react";
import type { ContentPost } from "../types";

type Props = {
  posts: ContentPost[];
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ContentCadencePanel({ posts }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(now.getDate() - 7);
    const last28 = new Date(now);
    last28.setDate(now.getDate() - 28);
    const next7 = new Date(now);
    next7.setDate(now.getDate() + 7);

    const drafts = posts.filter((post) => post.status === "draft");
    const scheduled = posts.filter((post) => post.status === "scheduled");
    const published = posts.filter((post) => post.status === "published");

    const publishedLast7 = published.filter((post) => {
      const publishedAt = parseDate(post.published_at);
      return publishedAt ? publishedAt >= last7 : false;
    });

    const publishedLast28 = published.filter((post) => {
      const publishedAt = parseDate(post.published_at);
      return publishedAt ? publishedAt >= last28 : false;
    });

    const scheduledNext7 = scheduled.filter((post) => {
      const scheduledFor = parseDate(post.scheduled_for);
      return scheduledFor ? scheduledFor >= now && scheduledFor <= next7 : false;
    });

    const nextScheduled = scheduled
      .map((post) => parseDate(post.scheduled_for))
      .filter((date): date is Date => date !== null && date >= now)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const lastPublished = published
      .map((post) => parseDate(post.published_at))
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      drafts: drafts.length,
      scheduled: scheduled.length,
      scheduledNext7: scheduledNext7.length,
      publishedLast7: publishedLast7.length,
      averageWeekly: publishedLast28.length / 4,
      emailSent: posts.reduce((total, post) => total + (post.email_sent_count || 0), 0),
      emailFailed: posts.reduce(
        (total, post) => total + (post.email_failed_count || 0),
        0,
      ),
      nextScheduledLabel: nextScheduled
        ? format(nextScheduled, "MMM d, h:mm a")
        : "None",
      lastPublishedLabel: lastPublished
        ? format(lastPublished, "MMM d, h:mm a")
        : "None",
    };
  }, [posts]);

  const cards = [
    {
      label: "Drafts",
      value: stats.drafts,
      detail: "Need schedule or publish",
      icon: TimerReset,
    },
    {
      label: "Scheduled",
      value: stats.scheduled,
      detail: `${stats.scheduledNext7} in next 7 days`,
      icon: CalendarClock,
    },
    {
      label: "Published",
      value: stats.publishedLast7,
      detail: `${stats.averageWeekly.toFixed(1)} per week over 28 days`,
      icon: Send,
    },
    {
      label: "Email",
      value: stats.emailSent,
      detail: stats.emailFailed ? `${stats.emailFailed} failed` : "No failures",
      icon: MailCheck,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <Icon className="h-5 w-5 text-cyan-600" />
              </div>
              <p className="mt-2 text-xs text-slate-500">{card.detail}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div>
            <span className="font-medium text-slate-900">Next scheduled:</span>{" "}
            {stats.nextScheduledLabel}
          </div>
          <div>
            <span className="font-medium text-slate-900">Last published:</span>{" "}
            {stats.lastPublishedLabel}
          </div>
        </div>
      </Card>
    </div>
  );
}
