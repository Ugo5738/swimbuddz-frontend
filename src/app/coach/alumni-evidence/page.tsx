"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { apiGet, apiPost } from "@/lib/api";

type Clip = {
  id: string;
  enrollment_id: string;
  milestone_id: string;
  kind: string;
  video_media_id: string;
  caption: string | null;
  coach_notes?: string | null;
  created_at: string;
};

export default function CoachAlumniEvidencePage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try { setClips(await apiGet<Clip[]>("/api/v1/academy/coach/evidence", {auth:true})); }
    catch { setMessage("Unable to retrieve student uploads."); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function save(item: Clip) {
    const coach_notes = notes[item.id]?.trim();
    if (!coach_notes) { setMessage("Enter your feedback."); return; }
    setSaving(item.id);
    try {
      await apiPost(`/api/v1/academy/evidence/${item.id}/coach-review`,
        {coach_notes}, {auth:true});
      setMessage("Feedback saved without changing milestone assessments.");
      await reload();
    } catch { setMessage("Unable to save feedback."); }
    finally { setSaving(null); }
  }
  return <main className="mx-auto max-w-4xl space-y-5 p-6">
    <h1 className="text-3xl font-bold">Alumni progress videos</h1>
    <p className="text-slate-600">Optional feedback on uploads by swimmers from your cohorts. These reviews are separate from milestone verification.</p>
    {message && <p role="status">{message}</p>}
    {clips.length===0 && <p>No videos to review.</p>}
    {clips.map(item=><section key={item.id} className="space-y-3 rounded-xl border p-5">
      <p className="font-semibold">Enrollment {item.enrollment_id}</p>
      <p className="text-sm text-slate-500">{new Date(item.created_at).toLocaleDateString()} · {item.kind}</p>
      {item.caption && <p>{item.caption}</p>}
      <a href={`${API_BASE_URL}/api/v1/academy/evidence/${item.id}/play`} target="_blank" rel="noopener noreferrer" className="text-cyan-700 underline">Open video</a>
      {item.coach_notes && <p className="text-sm">Previous coach feedback: {item.coach_notes}</p>}
      <label className="block text-sm">Feedback
        <textarea rows={3} maxLength={2000} className="mt-1 w-full rounded-lg border p-3" value={notes[item.id] || ""} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))}/>
      </label>
      <button type="button" disabled={saving===item.id} onClick={()=>void save(item)} className="rounded-lg bg-cyan-700 px-4 py-2 text-white disabled:opacity-50">Save optional feedback</button>
    </section>)}
  </main>;
}
