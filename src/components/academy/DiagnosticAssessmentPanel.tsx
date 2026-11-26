"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Textarea } from "@/components/ui/Textarea";
import {
  CompetencyPassportApi,
  extractRubricCriteriaCodes,
} from "@/lib/academy/competency-passport";
import {
  type CurriculumDefinition,
  CurriculumLibraryApi,
  type CurriculumVersion,
} from "@/lib/academy/curriculum-library";

const errorText = (err: unknown) =>
  err instanceof Error ? err.message : "The request could not be completed.";

export function DiagnosticAssessmentPanel({
  onIssued,
  onError,
}: {
  onIssued: () => void;
  onError: (msg: string) => void;
}) {
  const [milestones, setMilestones] = useState<CurriculumDefinition[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const [versions, setVersions] = useState<CurriculumVersion[]>([]);
  const [versionId, setVersionId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [memberAuthId, setMemberAuthId] = useState("");
  const [clinicLabel, setClinicLabel] = useState("");
  const [evidenceMediaId, setEvidenceMediaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    CurriculumLibraryApi.definitions("milestone")
      .then((list) => {
        const active = list.filter((m) => !m.is_retired);
        setMilestones(active);
        if (active[0]) setMilestoneId(active[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!milestoneId) {
      setVersions([]);
      setVersionId("");
      return;
    }
    CurriculumLibraryApi.versions("milestone", milestoneId)
      .then((vers) => {
        const portable = vers.filter(
          (v) =>
            v.state === "published" &&
            (v.content.evidence_policy === "video" ||
              v.content.evidence_policy === "time_trial"),
        );
        setVersions(portable);
        setVersionId(portable[0]?.id || "");
      })
      .catch(() => {});
  }, [milestoneId]);

  const selectedVersion = versions.find((v) => v.id === versionId);
  const criteria = useMemo(() => {
    const rubric = selectedVersion?.content.rubric_json as
      | Record<string, unknown>
      | undefined;
    return extractRubricCriteriaCodes(rubric);
  }, [selectedVersion]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const c of criteria) next[c] = false;
    setChecked(next);
  }, [criteria]);

  const allChecked =
    criteria.length > 0 && criteria.every((code) => checked[code] === true);
  const trimmedMemberId = memberId.trim();
  const linkedId =
    trimmedMemberId && versionId
      ? `diagnostic:${trimmedMemberId}:${versionId}`
      : undefined;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedMemberId || !versionId || !evidenceMediaId || !allChecked) return;
    setBusy(true);
    onError("");
    try {
      await CompetencyPassportApi.assessDiagnostic({
        member_id: trimmedMemberId,
        member_auth_id: memberAuthId.trim() || undefined,
        milestone_version_id: versionId,
        evidence_media_id: evidenceMediaId,
        evidence_uploaded_by: "assessor",
        criteria_passed: criteria,
        assessment_notes: notes.trim(),
        clinic_label: clinicLabel.trim() || undefined,
      });
      toast.success("Diagnostic competency verification issued");
      setEvidenceMediaId(null);
      setNotes("");
      onIssued();
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Record Diagnostic Clinic Assessment
          </h2>
          <p className="text-xs text-slate-600">
            Issue portable pre-enrollment prerequisite credit from an Intro-to-Water
            or diagnostic clinic. Requires private assessment video and full rubric attestation.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Member UUID"
            name="diag-member-id"
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="e.g. 8c2e..."
          />
          <Input
            label="Member Auth ID (optional — auto-resolved if omitted)"
            name="diag-member-auth-id"
            value={memberAuthId}
            onChange={(e) => setMemberAuthId(e.target.value)}
            placeholder="Supabase auth UUID"
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Canonical V2 Milestone
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.code})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Published Video/Time-Trial Version
            <select
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {versions.length === 0 && (
                <option value="">No published video-eligible version</option>
              )}
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} ({String(v.content.evidence_policy)})
                </option>
              ))}
            </select>
          </label>
        </div>

        <Input
          label="Diagnostic clinic label (optional)"
          name="clinic-label"
          value={clinicLabel}
          onChange={(e) => setClinicLabel(e.target.value)}
          placeholder="e.g. Yaba Intro-to-Water Clinic — Nov 2026"
        />

        {linkedId ? (
          <MediaInput
            purpose="milestone_evidence"
            linkedId={linkedId}
            mode="upload-only"
            accept="video/*"
            value={evidenceMediaId}
            onChange={setEvidenceMediaId}
            onUploadingChange={setUploading}
            label="Diagnostic assessment video (private S3 evidence)"
            showPreview={true}
          />
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Enter a Member UUID and select a published milestone version to unlock video upload.
          </p>
        )}

        <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
          <legend className="text-xs font-semibold text-slate-800">
            Attest every published rubric criterion ({criteria.length})
          </legend>
          {criteria.length === 0 ? (
            <p className="text-xs text-amber-800">No rubric criteria on this version.</p>
          ) : (
            criteria.map((code) => (
              <label key={code} className="flex items-center gap-2 text-xs text-slate-800">
                <input
                  type="checkbox"
                  checked={checked[code] === true}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [code]: e.target.checked }))
                  }
                />
                <code>{code}</code>
              </label>
            ))
          )}
        </fieldset>

        <Textarea
          label={`Assessment notes (${notes.trim().length}/20 min chars)`}
          name="diag-notes"
          required
          minLength={20}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the swimmer's observed execution, depth, and breathing composure..."
        />

        <Button
          type="submit"
          disabled={
            busy ||
            uploading ||
            !trimmedMemberId ||
            !versionId ||
            !evidenceMediaId ||
            !allChecked ||
            notes.trim().length < 20
          }
        >
          Issue Diagnostic Competency Credit
        </Button>
      </form>
    </Card>
  );
}
