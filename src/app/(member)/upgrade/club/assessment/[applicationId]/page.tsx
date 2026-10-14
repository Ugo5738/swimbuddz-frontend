"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { MediaInput } from "@/components/ui/MediaInput";
import { EvidenceMedia } from "@/components/academy/EvidenceMedia";
import { useApi } from "@/hooks/useApi";
import { ClubApplication, submitClubVideoAssessment } from "@/lib/clubOnboarding";

export default function ClubAssessmentMethodPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const router = useRouter();
  const applications = useApi<ClubApplication[]>("/api/v1/clubs/applications/me");
  const application = applications.data?.find(item => item.id === applicationId);
  const report = application?.assessment?.self_report ?? {};
  const [method, setMethod] = useState<"in_person" | "video">("in_person");
  const [swim, setSwim] = useState<string | null>(null);
  const [tread, setTread] = useState<string | null>(null);
  const [safe, setSafe] = useState(false);
  const [uncut, setUncut] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const status = String(report.video_review_status ?? "");
  const previousSwim = String(report.swim_video_media_id ?? "");
  const previousTread = String(report.tread_video_media_id ?? "");
  const blocked = ["submitted", "reviewed"].includes(status) ||
    ["approved", "enrolled", "academy_recommended"].includes(application?.status ?? "");

  const submit = async () => {
    if (!swim || !tread || !safe || !uncut || uploading || submitting) return;
    setSubmitting(true);
    try {
      await submitClubVideoAssessment(applicationId, {
        swim_video_media_id: swim,
        tread_video_media_id: tread,
        recorded_in_supervised_pool: safe,
        authentic_uncut_footage: uncut,
        notes: notes.trim() || undefined,
      });
      toast.success("Your videos have been submitted for Club readiness review.");
      await applications.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit video assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (applications.loading) return <p className="p-6">Loading your Club assessment…</p>;
  if (!application) return <Alert variant="error">Club application not found in your account.</Alert>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <h1 className="text-2xl font-bold text-slate-900">Choose your Club assessment</h1>
      <p className="text-slate-600">
        If you already swim, you can submit existing footage or record new clips.
        A qualified SwimBuddz reviewer must verify your readiness before checkout.
      </p>
      {status === "submitted" && <Alert variant="success">Your video evidence is awaiting coach review. You will receive your outcome by email.</Alert>}
      {status === "request_another_video" && <Alert variant="info">Please submit clearer replacement footage: {String(report.video_feedback ?? "")}</Alert>}
      {status === "in_person_required" && <Alert variant="info">A short in-pool assessment is required: {String(report.video_feedback ?? "")}</Alert>}
      {application.status === "approved" && <Alert variant="success">
        Approved! <Button size="sm" onClick={() => router.push("/upgrade/club/plan")}>Continue Club registration</Button>
      </Alert>}
      {!blocked && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold">Assessment method</h2>
            <label className="flex gap-2"><input type="radio" checked={method === "in_person"} onChange={() => setMethod("in_person")} /> Short in-pool assessment (10–15 minutes)</label>
            <label className="flex gap-2"><input type="radio" checked={method === "video"} onChange={() => setMethod("video")} /> Submit a video assessment</label>
            {method === "in_person" ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm">
                We'll contact you to arrange an in-pool assessment at an appropriate SwimBuddz location.
                You'll receive your result and registration instructions afterwards.
              </p>
            ) : (
              <div className="space-y-5">
                <p className="text-sm">
                  Upload two clear clips from a safely supervised pool. Existing footage is welcome.
                  Clip 1 must show an uncut, continuous 25-metre swim from start to finish, with breathing and control visible.
                  Clip 2 must show at least 30 seconds of treading water without using the wall or floor.
                  Footage must make the swimmer identifiable and demonstrate safe recovery.
                </p>
                <div>
                  <h3 className="font-semibold mb-2">25-metre continuous swim</h3>
                  <MediaInput key={applicationId + "-swim-" + status} purpose="club_assessment_video" linkedId={applicationId}
                    accept="video/*" value={swim} onChange={setSwim} onUploadingChange={setUploading}
                    label="Upload your continuous swimming clip" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">30 seconds of treading water</h3>
                  <MediaInput key={applicationId + "-tread-" + status} purpose="club_assessment_video" linkedId={applicationId}
                    accept="video/*" value={tread} onChange={setTread} onUploadingChange={setUploading}
                    label="Upload your treading-water clip" />
                </div>
                <label className="block text-sm">Additional context (optional)
                  <textarea className="mt-2 w-full rounded border p-3" rows={3} value={notes} onChange={event => setNotes(event.target.value)}
                    placeholder="When and where were the videos filmed?" />
                </label>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={safe} onChange={e => setSafe(e.target.checked)} /> I confirm the clips were recorded in a safe, supervised swimming environment.</label>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={uncut} onChange={e => setUncut(e.target.checked)} /> I confirm the footage is genuine and the required swimming segments are uncut.</label>
                <Button onClick={submit} disabled={!swim || !tread || !safe || !uncut || uploading || submitting}>
                  {submitting ? "Submitting…" : "Submit videos for assessment"}
                </Button>
                <p className="text-xs text-slate-500">Videos are private and used only for Club readiness assessment. Video approval is provisional until your coach verifies your ability at your first Club session.</p>
              </div>
            )}
          </div>
        </Card>
      )}
      {(previousSwim || previousTread) && <Card>
        <h2 className="font-semibold mb-3">Submitted evidence</h2>
        {previousSwim && <EvidenceMedia mediaId={previousSwim} label="25-metre swim" />}
        {previousTread && <EvidenceMedia mediaId={previousTread} label="30-second tread" />}
      </Card>}
    </div>
  );
}
