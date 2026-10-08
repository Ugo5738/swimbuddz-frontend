"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Evidence = {
  id: string;
  enrollment_id: string;
  milestone_id: string;
  video_media_id: string;
  kind: string;
  caption: string | null;
  coach_notes?: string | null;
  consent_to_share: boolean;
  publication_consent_at?: string | null;
  approved_for_public: boolean;
  created_at: string;
};
export default function AdminAlumniEvidencePage() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      const rows = await apiGet<Evidence[]>("/api/v1/academy/admin/evidence", { auth: true });
      setItems(rows);
    } catch { setNotice("Unable to load videos."); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const coachReview = async (id: string) => {
    const coach_notes = feedback[id]?.trim();
    if (!coach_notes) { setNotice("Enter coaching feedback first."); return; }
    setBusy(id); setNotice("");
    try {
      await apiPost(`/api/v1/academy/evidence/${id}/coach-review`, { coach_notes }, { auth: true });
      await reload();
      setNotice("Coaching feedback saved without changing milestone verification.");
    } catch { setNotice("Unable to save coaching feedback."); }
    finally { setBusy(null); }
  };
  const review = async (id: string, approve: boolean) => {
    const notes = feedback[id]?.trim();
    if (!notes) { setNotice("Add a review note before submitting."); return; }
    setBusy(id); setNotice("");
    try {
      await apiPost(`/api/v1/academy/admin/evidence/${id}/showcase`, {
        approve, review_notes: notes,
        publication_consent_confirmed: Boolean(verified[id]),
      }, { auth: true });
      await reload();
      setNotice("Review saved.");
    } catch { setNotice("Review could not be saved. Verify consent and try again."); }
    finally { setBusy(null); }
  };
  return <main className="mx-auto max-w-5xl space-y-5 p-6">
    <h1 className="text-3xl font-bold">Alumni video reviews</h1>
    <p className="text-slate-600">Uploaded videos are private. Only approve content after checking the swimmer’s separate permission to publish and any other people visible in the video.</p>
    {notice && <p role="status" className="rounded-lg bg-slate-100 p-3">{notice}</p>}
    {!items.length && <p>No alumni uploads to review.</p>}
    {items.map(item=><section key={item.id} className="space-y-3 rounded-xl border bg-white p-5">
      <p className="font-semibold">Enrollment {item.enrollment_id}</p>
      <p className="text-sm text-slate-500">Milestone {item.milestone_id} · {new Date(item.created_at).toLocaleDateString()}</p>
      <p>{item.caption || "No note from swimmer"}</p>
      <a className="text-cyan-700 underline" href={`/api/v1/media/media/${item.video_media_id}/play`} target="_blank" rel="noopener noreferrer">Open media (requires authorized access)</a>
      <p className="text-sm">Publication permission: {item.publication_consent_at ? "Yes" : "No"} · Showcase status: {item.approved_for_public ? "Approved" : "Private"}</p>
      <label className="block text-sm font-medium">Editorial review notes
        <textarea className="mt-2 w-full rounded-lg border p-3" rows={2} value={feedback[item.id] || ""} onChange={e=>setFeedback(v=>({...v,[item.id]:e.target.value}))}/>
      </label>
      {item.coach_notes && <p className="text-sm text-slate-700">Coach: {item.coach_notes}</p>}
      <button type="button" disabled={busy===item.id} onClick={()=>void coachReview(item.id)} className="rounded-lg border border-cyan-700 px-4 py-2 font-medium text-cyan-700">Save coaching feedback</button>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={Boolean(verified[item.id])} onChange={e=>setVerified(v=>({...v,[item.id]:e.target.checked}))}/> I have verified separate publication consent and permissions for everyone identifiable in this video.</label>
      <div className="flex gap-3"><button type="button" disabled={busy===item.id} onClick={()=>void review(item.id,false)} className="rounded-lg border px-4 py-2">Keep private / revoke</button><button type="button" disabled={busy===item.id || !item.publication_consent_at || !verified[item.id]} onClick={()=>void review(item.id,true)} className="rounded-lg bg-cyan-700 px-4 py-2 text-white disabled:opacity-50">Approve for showcase</button></div>
    </section>)}
  </main>;
}
