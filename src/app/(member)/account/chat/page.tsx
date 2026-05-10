"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import {
  type ChannelSummary,
  isChannelMuted,
  listMyChannels,
} from "@/lib/chat";
import { formatDistanceToNow } from "date-fns";
import { BellOff, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ChatChannelListPage() {
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await listMyChannels();
      // Sort: unread channels first (by unread count desc), then by last
      // message recency. Channels with no messages drop to the bottom.
      const sorted = [...result].sort((a, b) => {
        if (a.unread_count !== b.unread_count) {
          return b.unread_count - a.unread_count;
        }
        const aTime = a.last_message?.created_at ?? a.created_at;
        const bTime = b.last_message?.created_at ?? b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      setChannels(sorted);
      setError(null);
    } catch (err) {
      console.error("Failed to load chat channels", err);
      const message =
        err instanceof Error ? err.message : "Could not load chat channels";
      setError(message);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (channels === null && !error) {
    return <LoadingPage />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chat</h1>
          <p className="text-sm text-slate-500">
            Your cohort, event, and group conversations.
          </p>
        </div>
      </header>

      {error ? (
        <Card className="p-6 text-center text-sm text-rose-600">
          {error}
        </Card>
      ) : channels && channels.length === 0 ? (
        <Card className="p-10 text-center">
          <MessageCircle className="mx-auto mb-3 size-8 text-slate-500" />
          <p className="text-sm text-slate-500">
            No conversations yet. They appear here as soon as you join a
            cohort, RSVP to an event, or are added to a group.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {(channels ?? []).map((c) => (
            <li key={c.id}>
              <ChannelRow channel={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function ChannelRow({ channel }: { channel: ChannelSummary }) {
  const muted = isChannelMuted(channel);
  const lastAt = channel.last_message?.created_at;
  const lastAtLabel = lastAt
    ? formatDistanceToNow(new Date(lastAt), { addSuffix: true })
    : null;

  return (
    <Link
      href={`/account/chat/${channel.id}`}
      className="block focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md"
    >
      <Card className="p-4 transition-colors hover:bg-slate-50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-medium">{channel.name}</h2>
              {muted && (
                <BellOff className="size-3.5 shrink-0 text-slate-500" />
              )}
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-slate-500">
              {channel.last_message?.body_preview ??
                "No messages yet — say hello."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {lastAtLabel && (
              <span className="text-xs text-slate-500">
                {lastAtLabel}
              </span>
            )}
            {channel.unread_count > 0 && (
              <Badge variant="danger">
                {channel.unread_count > 99 ? "99+" : channel.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
