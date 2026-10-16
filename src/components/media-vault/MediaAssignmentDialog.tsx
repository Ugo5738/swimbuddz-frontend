"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import type { VaultMedia } from "@/lib/media-vault";
import { SessionsApi, type Session } from "@/lib/sessions";
import { toast } from "sonner";

type Member = { id: string; first_name: string; last_name: string; email: string };

export function MediaAssignmentDialog({
  vaultId, items, onClose, onSaved,
}: {
  vaultId: string; items: VaultMedia[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Member[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [changeSession, setChangeSession] = useState(false);
  const [replaceFeatured, setReplaceFeatured] = useState(false);
  const [grantAccess, setGrantAccess] = useState(false);
  const shareEligible = items.every(item =>
    item.processing_status === "ready" &&
    ["approved", "published"].includes(item.review_status) &&
    item.consent_status === "cleared" &&
    item.session_visibility !== "session_participants"
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    SessionsApi.listAllSessions({ include_drafts: false })
      .then(rows => setSessions(rows.filter(s => s.status !== "cancelled")))
      .catch(() => setSessions([]));
  }, []);
  useEffect(() => {
    if (search.trim().length < 2) { setMatches([]); return; }
    let active = true;
    const timeout = setTimeout(() => {
      apiGet<Member[]>(`/api/v1/members/?limit=20&search=${encodeURIComponent(search.trim())}`, { auth: true })
        .then(rows => { if (active) setMatches(rows.slice(0, 10)); })
        .catch(() => { if (active) setMatches([]); });
    }, 250);
    return () => { active = false; clearTimeout(timeout); };
  }, [search]);
  const save = async () => {
    if (!members.length && !(changeSession && sessionId) && !replaceFeatured) return;
    setBusy(true);
    try {
      await apiPatch(
        `/api/v1/media/vaults/${vaultId}/items/assignment`,
        {
          media_item_ids: items.map(item => item.id),
          member_ids: members.map(member => member.id),
          session_id: changeSession ? sessionId || null : null,
          replace_featured: replaceFeatured,
          grant_access_to_featured: grantAccess,
        },
        { auth: true }
      );
      toast.success(grantAccess ? "Media assigned and privately shared with selected swimmers" : "Media associations saved; viewing access remains unchanged");
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save media assignment");
    } finally { setBusy(false); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Associate media with swimmers and sessions"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Associate {items.length} files</h2>
        <p className="text-sm text-slate-600">Tag the swimmers featured or link recordings to a real session, without reuploading the originals. This does not automatically share the recordings.</p>
        <label className="block text-sm font-medium text-slate-700">
          Swimmers featured
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members by name or email"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        {matches.length > 0 && <div className="max-h-36 overflow-y-auto rounded-lg border">
          {matches.map(member => <button key={member.id} type="button" onClick={() => {
            setMembers(old => old.some(m => m.id === member.id) ? old : [...old,member]);
            setSearch(""); setMatches([]);
          }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100">
            {member.first_name} {member.last_name} · {member.email}
          </button>)}
        </div>}
        <div className="flex flex-wrap gap-2">
          {members.map(member => <button type="button" key={member.id}
            className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs text-cyan-900"
            onClick={() => setMembers(old => old.filter(m => m.id !== member.id))}>
            {member.first_name} {member.last_name} ×
          </button>)}
        </div>
        <label className="flex items-start gap-2 rounded-lg bg-cyan-50 p-3 text-sm text-slate-800">
          <input type="checkbox" checked={grantAccess} disabled={!shareEligible || !members.length}
            onChange={e => setGrantAccess(e.target.checked)} className="mt-0.5" />
          <span><strong>Also let these swimmers view the selected files</strong>
            <span className="mt-1 block text-xs text-slate-600">Only approved, consent-cleared photos or videos can be shared. This is separate from identifying people featured in the media.</span>
          </span>
        </label>
        {!shareEligible && <p className="text-xs text-amber-800">To grant access now, first approve the files, clear consent, and use Private or Selected Members visibility in Review.</p>}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={replaceFeatured} onChange={e => setReplaceFeatured(e.target.checked)} />
          Replace existing featured-member associations instead of adding to them
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={changeSession} onChange={e => setChangeSession(e.target.checked)} />
          Also associate these files with a scheduled swim
        </label>
        {changeSession && <select value={sessionId} onChange={e => setSessionId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white p-3">
          <option value="">Select session</option>
          {sessions.map(session => <option key={session.id} value={session.id}>
            {session.title} · {new Date(session.starts_at).toLocaleDateString("en-NG")}
          </option>)}
        </select>}
        <p className="text-xs text-amber-800">If existing session-participant visibility is changed to another session, viewing access is reset to private until you review it.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={busy || (!members.length && !(changeSession && sessionId) && !replaceFeatured)}
            className="rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white disabled:opacity-40">
            {busy ? "Saving…" : "Save association"}
          </button>
        </div>
      </div>
    </div>
  );
}
