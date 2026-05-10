import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

// ─── Types ────────────────────────────────────────────────────────────
//
// Mirrors the Pydantic schemas in `services/chat_service/schemas/`. Kept
// inline (not auto-generated) for now to match the convention used by the
// rest of `src/lib/*` — switch to api-types.ts imports when those get
// regenerated against the new chat OpenAPI surface.

export type ChannelType = "group" | "broadcast" | "direct";

export type ParentEntityType =
  | "cohort"
  | "pod"
  | "event"
  | "trip"
  | "location"
  | "role"
  | "none";

export type ChannelMemberRole =
  | "observer"
  | "member"
  | "moderator"
  | "admin";

export type RetentionPolicy =
  | "cohort"
  | "pod"
  | "event"
  | "trip"
  | "location"
  | "alumni"
  | "coach_parent_dm"
  | "support_dm";

export type SafeguardingReviewState =
  | "none"
  | "flagged"
  | "reviewed_ok"
  | "reviewed_actioned";

export type ReportReason =
  | "safeguarding"
  | "harassment"
  | "spam"
  | "other";

export type ReportStatus =
  | "open"
  | "under_review"
  | "resolved"
  | "dismissed";

export type LastMessagePreview = {
  id: string;
  sender_id: string;
  body_preview: string;
  created_at: string;
};

export type ChannelSummary = {
  id: string;
  type: ChannelType;
  parent_entity_type: ParentEntityType;
  parent_entity_id: string | null;
  name: string;
  archived_at: string | null;
  created_at: string;
  my_role: ChannelMemberRole;
  my_muted_until: string | null;
  my_last_read_message_id: string | null;
  unread_count: number;
  last_message: LastMessagePreview | null;
};

export type ChannelDetail = ChannelSummary & {
  description: string | null;
  retention_policy: RetentionPolicy;
  created_by: string | null;
  safeguarding_flags: Record<string, unknown>;
  member_count: number;
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type AttachmentModeration = {
  provider: string;
  flagged: boolean;
  skipped: boolean;
  top_category: string | null;
  top_confidence: number | null;
};

export type AttachmentDescriptor = {
  type: "image";
  storage_key: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  public_url: string | null;
  moderation: AttachmentModeration | null;
};

export type AttachmentUploadResponse = {
  descriptor: AttachmentDescriptor | null;
  rejected: boolean;
  rejection_reason: string | null;
};

export type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  attachments: AttachmentDescriptor[];
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reactions: ReactionSummary[];
};

export type MessageListPage = {
  items: Message[];
  next_before_id: string | null;
  has_more: boolean;
};

export type SendMessageRequest = {
  body: string;
  attachments?: AttachmentDescriptor[];
  reply_to_id?: string | null;
  /** Generated client-side; reusing it on retry de-duplicates server-side. */
  client_message_id: string;
};

export type Report = {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: ReportReason;
  note: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
};

// Restricted set per design doc §8.3 — keep in sync with the backend's
// ALLOWED_REACTION_EMOJI in services/chat_service/schemas/common.py.
export const ALLOWED_REACTIONS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🎉",
  "✅",
] as const;

// ─── API ──────────────────────────────────────────────────────────────

export function listMyChannels() {
  return apiGet<ChannelSummary[]>("/api/v1/chat/channels", { auth: true });
}

export function getChannel(channelId: string) {
  return apiGet<ChannelDetail>(`/api/v1/chat/channels/${channelId}`, {
    auth: true,
  });
}

export function listChannelMessages(
  channelId: string,
  opts?: { beforeId?: string; limit?: number },
) {
  const qs = new URLSearchParams();
  if (opts?.beforeId) qs.set("before_id", opts.beforeId);
  if (opts?.limit) qs.set("limit", String(opts.limit));
  const path = `/api/v1/chat/channels/${channelId}/messages${
    qs.toString() ? `?${qs}` : ""
  }`;
  return apiGet<MessageListPage>(path, { auth: true });
}

export function sendMessage(
  channelId: string,
  body: SendMessageRequest,
) {
  return apiPost<Message>(
    `/api/v1/chat/channels/${channelId}/messages`,
    body,
    { auth: true },
  );
}

export function editMessage(messageId: string, body: string) {
  return apiPatch<Message>(
    `/api/v1/chat/messages/${messageId}`,
    { body },
    { auth: true },
  );
}

export function deleteMessage(messageId: string) {
  return apiDelete<Message>(`/api/v1/chat/messages/${messageId}`, {
    auth: true,
  });
}

export function addReaction(messageId: string, emoji: string) {
  return apiPost<Message>(
    `/api/v1/chat/messages/${messageId}/reactions`,
    { emoji },
    { auth: true },
  );
}

export function removeReaction(messageId: string, emoji: string) {
  return apiDelete<Message>(
    `/api/v1/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { auth: true },
  );
}

export function markChannelRead(channelId: string, messageId: string) {
  return apiPost<void>(
    `/api/v1/chat/channels/${channelId}/read`,
    { message_id: messageId },
    { auth: true },
  );
}

export function muteChannel(
  channelId: string,
  mutedUntil: string | null,
) {
  return apiPost<void>(
    `/api/v1/chat/channels/${channelId}/mute`,
    { muted_until: mutedUntil },
    { auth: true },
  );
}

export function leaveChannel(channelId: string) {
  return apiPost<void>(
    `/api/v1/chat/channels/${channelId}/leave`,
    {},
    { auth: true },
  );
}

export function reportMessage(
  messageId: string,
  reason: ReportReason,
  note?: string,
) {
  return apiPost<Report>(
    `/api/v1/chat/messages/${messageId}/reports`,
    { reason, note },
    { auth: true },
  );
}

/**
 * Upload an image attachment. Uses raw `fetch` because the request is
 * `multipart/form-data` rather than JSON — `apiPost` always sets a JSON
 * `Content-Type` and would fight the FormData boundary.
 */
export async function uploadAttachment(
  file: File,
  accessToken: string,
): Promise<AttachmentUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  // Browsers tend to send "image/jpeg" etc. correctly already; pass it
  // through as a hint anyway in case the upstream picks octet-stream.
  if (file.type) form.append("mime", file.type);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const res = await fetch(`${baseUrl}/api/v1/chat/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Attachment upload failed (${res.status}): ${text || res.statusText}`,
    );
  }
  return (await res.json()) as AttachmentUploadResponse;
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Generate a v4 UUID for the `client_message_id` idempotency key.
 * Falls back to a timestamp-based id on browsers that lack `crypto.randomUUID`
 * (very old; safe enough for an idempotency seed within a single client). */
export function newClientMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** True if the channel currently has an active mute that hasn't expired. */
export function isChannelMuted(channel: Pick<ChannelSummary, "my_muted_until">) {
  if (!channel.my_muted_until) return false;
  return new Date(channel.my_muted_until).getTime() > Date.now();
}
