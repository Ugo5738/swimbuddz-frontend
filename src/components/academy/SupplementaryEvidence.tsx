"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaInput } from "@/components/ui/MediaInput";
import { apiGet, apiPost } from "@/lib/api";
import { useMediaUrl } from "@/hooks/useMediaUrl";

type Evidence = {
  id: string;
  milestone_id: string;
  video_media_id: string;
  kind: "cohort_archive" | "continued_progress";
  caption: string | null;
  recorded_on: string | null;
  created_at: string;
};
type Milestone = { id: string; name: string };

function EvidenceItem({ item }: { item: Evidence }) {
  const [url] = useMediaUrl(item.video_media_id);
  return <li className="rounded-lg border border-slate-200 p-3">
    <div className="text-xs text-slate-500">{item.kind === "cohort_archive" ? "Cohort archive" : "Continued progress"} · {new Date(item.created_at).toLocaleDateString()}</div>
    {item.caption && <p className="mt-1 text-sm">{item.caption}</p>}
    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-700 underline">View video</a>}
  </li>;
}

export function SupplementaryEvidence({ enrollmentId, milestones, canUpload }: {
  enrollmentId: string;
  milestones: Milestone[];
  canUpload: boolean;
}) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [kind, setKind] = useState<"cohort_archive" | "continued_progress">("cohort_archive");
  const [caption, setCaption] = useState("");
  const [recordedOn, setRecordedOn] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setItems(await apiGet<Evidence[]>(`/api/v1/academy/enrollments/${enrollmentId}/evidence`, { auth: true }));
    } catch {
      setError("Unable to load additional videos.");
    }
  }, [enrollmentId]);
  useEffect(() => { void reload(); }, [reload]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!milestoneId || !mediaId || uploading || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiPost(`/api/v1/academy/enrollments/${enrollmentId}/evidence`, {
        milestone_id: milestoneId, video_media_id: mediaId, kind,
        caption: caption.trim() || null, recorded_on: recordedOn || null,
        consent_to_share: consent,
      }, { auth: true });
      setMediaId(null); setCaption(""); setRecordedOn(""); setConsent(false);
      await reload();
    } catch {
      setError("Could not save the video. Check your enrollment access and try again.");
    } finally { setSaving(false); }
  };
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
    <h2 className="text-xl font-semibold text-slate-900">My Swimming Journey</h2>
    <p className="text-sm text-slate-600">Your cohort record stays final. Add videos from class or new swimming progress without changing verified assessments. Videos are private unless separately approved for publication.</p>
    {canUpload && <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">Milestone
        <select required value={milestoneId} onChange={e=>setMilestoneId(e.target.value)} className="mt-1 w-full rounded-lg border p-3">
          <option value="">Select milestone</option>
          {milestones.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">Video type
        <select value={kind} onChange={e=>setKind(e.target.value as typeof kind)} className="mt-1 w-full rounded-lg border p-3">
          <option value="cohort_archive">Video from my cohort</option>
          <option value="continued_progress">Progress since my cohort</option>
        </select>
      </label>
      <MediaInput purpose="milestone_evidence" mode="upload-only" value={mediaId} onChange={setMediaId} onUploadingChange={setUploading} accept="video/*" />
      <label className="block text-sm font-medium">When was this recorded? (optional)
        <input type="date" max={new Date().toISOString().slice(0,10)} value={recordedOn} onChange={e=>setRecordedOn(e.target.value)} className="mt-1 block w-full rounded-lg border p-3"/>
      </label>
      <label className="block text-sm font-medium">Your note (optional)
        <textarea maxLength={500} value={caption} onChange={e=>setCaption(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" rows={2}/>
      </label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> SwimBuddz may contact me about featuring this video. This does not publish it.</label>
      <button type="submit" disabled={!milestoneId || !mediaId || uploading || saving} className="rounded-lg bg-cyan-700 px-4 py-3 font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Save video"}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <ul className="space-y-2">{items.map(item=><EvidenceItem item={item} key={item.id}/>)}</ul>
    {!items.length && <p className="text-sm text-slate-500">No additional videos yet.</p>}
  </section>;
}
