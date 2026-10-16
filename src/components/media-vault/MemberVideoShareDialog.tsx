"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { VaultMedia } from "@/lib/media-vault";
import { toast } from "sonner";

type Member = { id: string; first_name: string; last_name: string; email: string };
type Result = { affected_count: number };

export function MemberVideoShareDialog({
  vaultId, videos, onClose,
}: {
  vaultId: string;
  videos: VaultMedia[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [hits, setHits] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"grant" | "revoke">("grant");
  const eligible = videos.every(
    (video) => ["VIDEO", "IMAGE"].includes(video.media_type) &&
      video.processing_status === "ready" &&
      video.consent_status === "cleared" &&
      ["approved", "published"].includes(video.review_status)
  );

  useEffect(() => {
    if (member || query.trim().length < 2) { setHits([]); return; }
    let active = true;
    const timeout = setTimeout(() => {
      apiGet<Member[]>(`/api/v1/members/?limit=20&search=${encodeURIComponent(query.trim())}`, { auth: true })
        .then((rows) => { if (active) setHits(rows.slice(0, 10)); })
        .catch(() => { if (active) setHits([]); });
    }, 250);
    return () => { active = false; clearTimeout(timeout); };
  }, [query, member]);

  const submit = async () => {
    if (!member || !videos.length || (action === "grant" && !eligible)) return;
    setSaving(true);
    try {
      const result = await apiPost<Result>(
        `/api/v1/media/vaults/${vaultId}/items/shares`,
        { media_item_ids: videos.map((item) => item.id), member_ids: [member.id], action },
        { auth: true }
      );
      toast.success(`${action === "grant" ? "Shared" : "Revoked"} access for ${result.affected_count} video(s)`);
      onClose();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not change sharing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Share selected session videos" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Member video access</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm">Close</button>
        </div>
        <p className="text-sm text-slate-600">
          Change access to {videos.length} selected file(s). Only approved, consent-cleared media can become visible in a member's My Videos gallery.
        </p>
        {!eligible && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            One or more selected files are not approved, consent-cleared, ready photos or videos.
            Resolve review and consent before granting access. Revocation is still available.
          </p>
        )}
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="share-action" checked={action === "grant"} onChange={() => setAction("grant")} />
            Share
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="share-action" checked={action === "revoke"} onChange={() => setAction("revoke")} />
            Revoke
          </label>
        </div>
        <div className="relative">
          <label htmlFor="member-share-search" className="block text-sm font-medium text-slate-800">SwimBuddz member</label>
          <input id="member-share-search" value={query} onChange={(event) => { setQuery(event.target.value); setMember(null); }}
            placeholder="Find by name or email" autoComplete="off" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          {hits.length > 0 && !member && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-white shadow-xl">
              {hits.map((entry) => (
                <button type="button" key={entry.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-cyan-50"
                  onClick={() => { setMember(entry); setQuery(`${entry.first_name} ${entry.last_name} (${entry.email})`); setHits([]); }}>
                  {entry.first_name} {entry.last_name} · {entry.email}
                </button>
              ))}
            </div>
          )}
          {member && <p className="mt-1 text-xs text-emerald-700">Selected: {member.email}</p>}
        </div>
        <button type="button" onClick={submit}
          disabled={saving || !member || (action === "grant" && !eligible)}
          className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
          {saving ? "Saving…" : action === "grant" ? "Share selected videos" : "Revoke selected videos"}
        </button>
      </div>
    </div>
  );
}
