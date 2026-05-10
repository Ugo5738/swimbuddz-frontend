"use client";

import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { supabase } from "@/lib/auth";
import {
  ALLOWED_REACTIONS,
  type ChannelDetail,
  type Message,
  type ReportReason,
  addReaction,
  deleteMessage,
  editMessage,
  getChannel,
  listChannelMessages,
  markChannelRead,
  newClientMessageId,
  removeReaction,
  reportMessage,
  sendMessage,
} from "@/lib/chat";
import { MembersApi } from "@/lib/members";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  Edit3,
  Flag,
  Loader2,
  MoreVertical,
  SendHorizonal,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const PAGE_SIZE = 50;
// Hard ceiling matching the backend (services/chat_service/schemas/common.py).
const MAX_BODY = 4000;

export default function ChannelDetailPage() {
  const params = useParams<{ channel_id: string }>();
  const channelId = params?.channel_id;

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [beforeCursor, setBeforeCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Replace one message in-place with the server's authoritative copy.
  // Used by every action that mutates a single message (edit, delete,
  // reaction toggle) — keeps state in sync without a full refetch.
  const upsertMessage = useCallback((msg: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
  }, []);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threadRef = useRef<HTMLDivElement | null>(null);
  // Cache the last-marked message so we don't keep POSTing the same id as the
  // user scrolls. Only fires when a *new* tail message arrives.
  const lastMarkedRef = useRef<string | null>(null);

  // ── Resolve the caller's member_id once, for "is this my message?" checks
  useEffect(() => {
    let cancelled = false;
    MembersApi.getMe()
      .then((m) => {
        if (!cancelled) setCurrentMemberId(m?.id ?? null);
      })
      .catch(() => {
        // Non-fatal — we just won't show owner-only actions.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    if (!channelId) return;
    let cancelled = false;

    (async () => {
      try {
        const [ch, page] = await Promise.all([
          getChannel(channelId),
          listChannelMessages(channelId, { limit: PAGE_SIZE }),
        ]);
        if (cancelled) return;
        setChannel(ch);
        // The API returns newest-first; render oldest-first so the thread
        // reads top-down naturally.
        setMessages([...page.items].reverse());
        setHasMore(page.has_more);
        setBeforeCursor(page.next_before_id);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Could not load this channel";
        setError(msg);
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  // ── Auto-scroll to bottom on new tail messages, and mark-read ────
  const latestId = messages[messages.length - 1]?.id ?? null;

  useEffect(() => {
    // Scroll only when we get a new tail message (latestId changed). On
    // older-page loads, latestId is unchanged and we keep the scroll
    // position so the user doesn't lose their place.
    if (!latestId) return;
    const el = threadRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [latestId]);

  useEffect(() => {
    if (!channelId || !latestId) return;
    if (lastMarkedRef.current === latestId) return;
    lastMarkedRef.current = latestId;
    void markChannelRead(channelId, latestId).catch(() => {
      // Best-effort; don't toast — read receipts are not critical.
    });
  }, [channelId, latestId]);

  // ── Realtime subscription ────────────────────────────────────────
  // Subscribe to inserts + updates on chat_messages for this channel.
  // RLS gates what we receive — non-members get nothing — so the client
  // doesn't need to re-authorise. Reactions are NOT subscribed yet (the
  // server returns a denormalised summary; updating it from raw reaction
  // rows is more work than it's worth for Phase 1 — they refresh on the
  // next add/remove or page reload).
  useEffect(() => {
    if (!channelId) return;
    const sub = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            // De-dupe against our own optimistic row (same id) and against
            // any duplicate event delivery.
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id ? { ...m, ...updated } : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [channelId]);

  // ── Older-page loader ────────────────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!channelId || !hasMore || !beforeCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listChannelMessages(channelId, {
        beforeId: beforeCursor,
        limit: PAGE_SIZE,
      });
      // Older messages prepend to the existing list (oldest at index 0).
      setMessages((prev) => [...page.items.slice().reverse(), ...prev]);
      setHasMore(page.has_more);
      setBeforeCursor(page.next_before_id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not load older messages";
      toast.error(msg);
    } finally {
      setLoadingMore(false);
    }
  }, [channelId, hasMore, beforeCursor, loadingMore]);

  // ── Send ─────────────────────────────────────────────────────────
  const trimmedDraft = draft.trim();
  const canSend = trimmedDraft.length > 0 && trimmedDraft.length <= MAX_BODY;

  const onSend = useCallback(async () => {
    if (!channelId || !canSend) return;
    setSending(true);
    const clientId = newClientMessageId();
    const optimistic: Message = {
      id: clientId,
      channel_id: channelId,
      sender_id: "__me__",
      body: trimmedDraft,
      attachments: [],
      reply_to_id: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      reactions: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const result = await sendMessage(channelId, {
        body: trimmedDraft,
        client_message_id: clientId,
      });
      // Replace the optimistic row with the server's authoritative copy.
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? result : m)),
      );
    } catch (err) {
      // Roll back the optimistic row and let the user retry from the toast.
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
      setDraft(trimmedDraft);
      const msg = err instanceof Error ? err.message : "Could not send message";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }, [channelId, canSend, trimmedDraft]);

  // ── Render ───────────────────────────────────────────────────────
  if (channel === null && !error) return <LoadingPage />;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
      <header className="mb-3 flex items-center gap-3">
        <Link
          href="/account/chat"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Back to chat list"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {channel?.name ?? ""}
          </h1>
          {channel ? (
            <p className="text-xs text-slate-500">
              {channel.member_count}{" "}
              {channel.member_count === 1 ? "member" : "members"}
              {channel.archived_at ? " · archived" : ""}
            </p>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto rounded-md border border-slate-100 bg-white"
      >
        {hasMore && (
          <div className="flex justify-center p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOlder}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading…
                </span>
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}

        <ol className="flex flex-col gap-2 p-3">
          {messages.map((m) => (
            <li key={m.id}>
              <MessageBubble
                message={m}
                isMine={
                  currentMemberId !== null && m.sender_id === currentMemberId
                }
                isOptimistic={m.sender_id === "__me__"}
                onUpdated={upsertMessage}
              />
            </li>
          ))}
          {messages.length === 0 && !error ? (
            <li className="py-12 text-center text-sm text-slate-500">
              No messages yet. Be the first to say hello.
            </li>
          ) : null}
        </ol>
      </div>

      <Composer
        draft={draft}
        onChange={setDraft}
        onSend={onSend}
        sending={sending}
        disabled={Boolean(channel?.archived_at)}
      />
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function MessageBubble({
  message,
  isMine,
  isOptimistic,
  onUpdated,
}: {
  message: Message;
  isMine: boolean;
  isOptimistic: boolean;
  onUpdated: (msg: Message) => void;
}) {
  const time = useMemo(
    () => format(new Date(message.created_at), "HH:mm"),
    [message.created_at],
  );
  const isDeleted = Boolean(message.deleted_at);

  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const onToggleReaction = useCallback(
    async (emoji: string, currentlyMine: boolean) => {
      try {
        const updated = currentlyMine
          ? await removeReaction(message.id, emoji)
          : await addReaction(message.id, emoji);
        onUpdated(updated);
      } catch (err) {
        const m = err instanceof Error ? err.message : "Reaction failed";
        toast.error(m);
      } finally {
        setShowEmojiPicker(false);
      }
    },
    [message.id, onUpdated],
  );

  const onSaveEdit = useCallback(async () => {
    const next = editDraft.trim();
    if (!next || next === message.body) {
      setEditing(false);
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await editMessage(message.id, next);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Edit failed";
      toast.error(m);
    } finally {
      setSavingEdit(false);
    }
  }, [editDraft, message.body, message.id, onUpdated]);

  const onDelete = useCallback(async () => {
    if (
      !window.confirm("Delete this message? It will show as [deleted] for everyone.")
    ) {
      return;
    }
    try {
      const updated = await deleteMessage(message.id);
      onUpdated(updated);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Delete failed";
      toast.error(m);
    } finally {
      setShowActions(false);
    }
  }, [message.id, onUpdated]);

  return (
    <div className="group flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="truncate font-medium text-slate-700">
          {isOptimistic ? "You (sending…)" : isMine ? "You" : shortId(message.sender_id)}
        </span>
        <span className="flex items-center gap-1">
          <span>
            {time}
            {message.edited_at ? " · edited" : ""}
          </span>
          {!isDeleted && !isOptimistic ? (
            <button
              type="button"
              className="rounded p-0.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700"
              onClick={() => setShowActions((v) => !v)}
              aria-label="Message actions"
            >
              <MoreVertical className="size-3.5" />
            </button>
          ) : null}
        </span>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            name="edit-message"
            label="Edit message"
            hideLabel
            rows={2}
            maxLength={MAX_BODY}
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setEditDraft(message.body);
              }}
              disabled={savingEdit}
            >
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={onSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <p
          className={
            isDeleted
              ? "text-sm italic text-slate-400"
              : "whitespace-pre-wrap text-sm text-slate-800"
          }
        >
          {message.body}
        </p>
      )}

      {!isDeleted && !isOptimistic ? (
        <ReactionRow
          message={message}
          onToggle={onToggleReaction}
          showPicker={showEmojiPicker}
          setShowPicker={setShowEmojiPicker}
        />
      ) : null}

      {showActions ? (
        <div className="mt-1 flex items-center gap-1 border-t border-slate-200 pt-1 text-xs">
          {isMine ? (
            <>
              <button
                type="button"
                className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-200"
                onClick={() => {
                  setEditing(true);
                  setShowActions(false);
                }}
              >
                <Edit3 className="size-3" /> Edit
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded px-2 py-1 text-rose-600 hover:bg-rose-50"
                onClick={onDelete}
              >
                <Trash2 className="size-3" /> Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-200"
              onClick={() => {
                setReportOpen(true);
                setShowActions(false);
              }}
            >
              <Flag className="size-3" /> Report
            </button>
          )}
        </div>
      ) : null}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        messageId={message.id}
      />
    </div>
  );
}

function ReactionRow({
  message,
  onToggle,
  showPicker,
  setShowPicker,
}: {
  message: Message;
  onToggle: (emoji: string, currentlyMine: boolean) => void;
  showPicker: boolean;
  setShowPicker: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {message.reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji, r.reacted_by_me)}
          className={
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition " +
            (r.reacted_by_me
              ? "border-cyan-300 bg-cyan-50 text-cyan-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100")
          }
          aria-label={`${r.emoji} ${r.count}${r.reacted_by_me ? " (you)" : ""}`}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
          aria-label="Add reaction"
        >
          <SmilePlus className="size-3.5" />
        </button>
        {showPicker ? (
          <div className="absolute z-10 mt-1 flex gap-0.5 rounded-md border border-slate-200 bg-white p-1 shadow-md">
            {ALLOWED_REACTIONS.map((emoji) => {
              const existing = message.reactions.find((r) => r.emoji === emoji);
              const mine = Boolean(existing?.reacted_by_me);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggle(emoji, mine)}
                  className={
                    "rounded p-1 text-base hover:bg-slate-100 " +
                    (mine ? "bg-cyan-50" : "")
                  }
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReportModal({
  open,
  onClose,
  messageId,
}: {
  open: boolean;
  onClose: () => void;
  messageId: string;
}) {
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await reportMessage(messageId, reason, note.trim() || undefined);
      toast.success("Report filed. Moderators will review it.");
      setNote("");
      onClose();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Could not file report";
      toast.error(m);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Report message">
      <div className="flex flex-col gap-4">
        <Select
          name="reason"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
        >
          <option value="harassment">Harassment</option>
          <option value="safeguarding">Safeguarding concern</option>
          <option value="spam">Spam</option>
          <option value="other">Other</option>
        </Select>
        <Textarea
          name="note"
          label="Note (optional)"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What about this message concerns you?"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Short, deterministic display for a UUID until we wire member name lookup. */
function shortId(id: string): string {
  return id.slice(0, 8);
}

function Composer({
  draft,
  onChange,
  onSend,
  sending,
  disabled,
}: {
  draft: string;
  onChange: (next: string) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter (or Cmd/Ctrl+Enter) inserts a newline.
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (disabled) {
    return (
      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-500">
        This channel is archived. New messages can no longer be posted.
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <div className="flex-1">
        <Textarea
          name="chat-message"
          label="Message"
          hideLabel
          rows={2}
          maxLength={MAX_BODY}
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <Button
        onClick={onSend}
        disabled={sending || draft.trim().length === 0}
        className="self-end"
        aria-label="Send message"
      >
        {sending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <SendHorizonal className="size-4" />
        )}
      </Button>
    </div>
  );
}
