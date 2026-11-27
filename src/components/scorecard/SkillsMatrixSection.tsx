"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  PROFICIENCY_LABELS,
  type ScorecardDomainSection,
  type ScorecardSkillItem,
  type SkillProficiency,
  updateMySkill,
  verifyMemberSkill,
} from "@/lib/scorecard";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ProficiencyBadge,
  SafetyGateBadge,
  TrustBadge,
  VerificationStatusBadge,
} from "./TrustBadge";

type Props = {
  memberId: string;
  domains: ScorecardDomainSection[];
  canEditSelf: boolean;
  canVerify: boolean;
  hasClubAccess: boolean;
  onUpdated: () => Promise<void> | void;
};

const PROFICIENCY_OPTIONS: SkillProficiency[] = [
  "not_started",
  "learning",
  "confident",
  "mastered",
];

export function SkillsMatrixSection({
  memberId,
  domains,
  canEditSelf,
  canVerify,
  hasClubAccess,
  onUpdated,
}: Props) {
  // Progressive disclosure: expand Foundations + Freestyle by default for
  // beginners, or any domain where the swimmer already has logged activity.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const d of domains) {
      initial[d.code] =
        d.default_expanded_for_beginner ||
        d.started_count > 0 ||
        d.pending_review_count > 0 ||
        (hasClubAccess && d.code === "advanced_skills");
    }
    return initial;
  });

  // Self-edit modal state
  const [editingSkill, setEditingSkill] = useState<ScorecardSkillItem | null>(null);
  const [editProficiency, setEditProficiency] = useState<SkillProficiency>("learning");
  const [editNotes, setEditNotes] = useState("");
  const [requestReview, setRequestReview] = useState(false);

  // Verifier modal state (Coach / Pod Lead / Admin)
  const [verifyingSkill, setVerifyingSkill] = useState<ScorecardSkillItem | null>(null);
  const [verifyAction, setVerifyAction] = useState<"verify" | "reject">("verify");
  const [verifyProficiency, setVerifyProficiency] =
    useState<SkillProficiency>("confident");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleDomain = (code: string) => {
    setExpanded((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const openSelfEdit = (skill: ScorecardSkillItem) => {
    setEditingSkill(skill);
    setEditProficiency(skill.proficiency === "not_started" ? "learning" : skill.proficiency);
    setEditNotes(skill.member_notes ?? "");
    setRequestReview(skill.verification_status === "pending_review");
  };

  const openVerifyModal = (skill: ScorecardSkillItem) => {
    setVerifyingSkill(skill);
    setVerifyAction("verify");
    setVerifyProficiency(
      skill.proficiency === "not_started" ? "confident" : skill.proficiency,
    );
    setVerifyNotes(skill.verifier_notes ?? "");
  };

  const handleSaveSelfSkill = async () => {
    if (!editingSkill) return;
    setSubmitting(true);
    try {
      await updateMySkill(editingSkill.skill_code, {
        proficiency: editProficiency,
        member_notes: editNotes.trim() || null,
        request_verification: requestReview,
      });
      toast.success(
        requestReview
          ? `Saved "${editingSkill.title}" and sent for Coach / Pod Lead verification.`
          : `Updated "${editingSkill.title}".`,
      );
      setEditingSkill(null);
      await onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update skill");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveVerification = async () => {
    if (!verifyingSkill) return;
    if (verifyAction === "reject" && !verifyNotes.trim()) {
      toast.error("Please add constructive feedback before requesting more practice.");
      return;
    }
    setSubmitting(true);
    try {
      await verifyMemberSkill(memberId, verifyingSkill.skill_code, {
        action: verifyAction,
        proficiency: verifyAction === "verify" ? verifyProficiency : undefined,
        verifier_notes: verifyNotes.trim() || undefined,
      });
      toast.success(
        verifyAction === "verify"
          ? `Verified "${verifyingSkill.title}" at ${PROFICIENCY_LABELS[verifyProficiency]}.`
          : `Sent feedback for "${verifyingSkill.title}".`,
      );
      setVerifyingSkill(null);
      await onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save verification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Water Foundations, Strokes &amp; Skills
          </h2>
          <p className="text-sm text-slate-500">
            Track what you can do across every stroke in Total Immersion order — ease of
            movement before speed. Self-log anytime and request Coach or Pod Lead verification.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              setExpanded(Object.fromEntries(domains.map((d) => [d.code, true])))
            }
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Expand all
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() =>
              setExpanded(
                Object.fromEntries(
                  domains.map((d) => [d.code, d.code === "foundations"]),
                ),
              )
            }
            className="font-semibold text-slate-500 hover:text-slate-700"
          >
            Focus foundations
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {domains.map((domain) => {
          const isOpen = Boolean(expanded[domain.code]);
          const pct =
            domain.total_skills > 0
              ? Math.round((domain.confident_or_mastered_count / domain.total_skills) * 100)
              : 0;
          const verifiedPct =
            domain.total_skills > 0
              ? Math.round((domain.verified_count / domain.total_skills) * 100)
              : 0;

          return (
            <Card key={domain.code} className="overflow-hidden p-0">
              <button
                type="button"
                onClick={() => toggleDomain(domain.code)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/80 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {domain.title}
                    </h3>
                    {domain.stroke_unlocked && (
                      <Badge variant="success">✓ Verified</Badge>
                    )}
                    {domain.pending_review_count > 0 && (
                      <Badge variant="warning">
                        {domain.pending_review_count} pending review
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {domain.description}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-slate-100">
                      <div className="relative h-full w-full">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-cyan-200 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${verifiedPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-slate-600 shrink-0">
                      {domain.verified_count}/{domain.total_skills} verified
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-slate-400">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {domain.skills.map((skill) => (
                    <div
                      key={skill.skill_code}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {skill.title}
                          </span>
                          <ProficiencyBadge proficiency={skill.proficiency} />
                          {skill.proficiency !== "not_started" && (
                            <TrustBadge source={skill.verification_source} compact />
                          )}
                          <VerificationStatusBadge status={skill.verification_status} />
                          {skill.is_safety_gate && (
                            <SafetyGateBadge cleared={skill.is_safety_gate_cleared} />
                          )}
                        </div>

                        <p className="text-xs text-slate-600">{skill.description}</p>

                        <p className="flex items-start gap-1.5 text-xs text-cyan-800 bg-cyan-50/70 rounded-lg px-2.5 py-1.5">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-cyan-600" />
                          <span>
                            <span className="font-semibold">TI Focus:</span>{" "}
                            {skill.ti_focal_point}
                          </span>
                        </p>

                        {skill.verified_proficiency &&
                          skill.verified_proficiency !== skill.proficiency && (
                            <p className="text-xs text-emerald-700">
                              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                              Coach-verified baseline:{" "}
                              <span className="font-semibold">
                                {PROFICIENCY_LABELS[skill.verified_proficiency]}
                              </span>
                            </p>
                          )}

                        {skill.auto_verified_via && (
                          <p className="text-[11px] text-emerald-700">
                            Auto-verified via {skill.auto_verified_via}
                          </p>
                        )}
                        {!skill.auto_verified_via && skill.verified_by_name && (
                          <p className="text-[11px] text-slate-500">
                            Verified by {skill.verified_by_name}
                            {skill.verified_at
                              ? ` · ${new Date(skill.verified_at).toLocaleDateString("en-NG")}`
                              : ""}
                          </p>
                        )}

                        {skill.member_notes && (
                          <p className="text-xs text-slate-600 italic">
                            Swimmer note: &ldquo;{skill.member_notes}&rdquo;
                          </p>
                        )}
                        {skill.verifier_notes && (
                          <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                            <span className="font-semibold">Coach / Pod Lead feedback:</span>{" "}
                            {skill.verifier_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {canEditSelf && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSelfEdit(skill)}
                            className="gap-1.5"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Update
                          </Button>
                        )}
                        {canVerify && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openVerifyModal(skill)}
                            className="gap-1.5"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Member Self-Update Modal */}
      <Modal
        isOpen={editingSkill !== null}
        onClose={() => setEditingSkill(null)}
        title={editingSkill ? `Update: ${editingSkill.title}` : "Update Skill"}
      >
        {editingSkill && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{editingSkill.description}</p>
            {editingSkill.is_safety_gate && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                This is a <strong>Safety Gate</strong>. You can log your practice progress
                anytime, and request Coach or Pod Lead verification to officially clear it.
              </div>
            )}
            {editingSkill.verified_proficiency && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                Your verified baseline (
                <strong>{PROFICIENCY_LABELS[editingSkill.verified_proficiency]}</strong>) is
                always preserved even when you claim a higher stage.
              </div>
            )}

            <Select
              label="Current stage"
              value={editProficiency}
              onChange={(e) => setEditProficiency(e.target.value as SkillProficiency)}
            >
              {PROFICIENCY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {PROFICIENCY_LABELS[opt]}
                </option>
              ))}
            </Select>

            <Textarea
              label="Practice reflection / notes (private)"
              placeholder="e.g. Felt much smoother breathing on left side in 25m pool..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
            />

            {editProficiency !== "not_started" && (
              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-sm cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={requestReview}
                  onChange={(e) => setRequestReview(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  <span className="font-semibold text-slate-900 block">
                    Request Coach / Pod Lead verification
                  </span>
                  <span className="text-xs text-slate-500">
                    Adds this skill to your Coach or Pod Lead&apos;s next deck review queue.
                  </span>
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingSkill(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSaveSelfSkill()} disabled={submitting}>
                {submitting ? "Saving..." : "Save progress"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Coach / Pod Lead / Admin Verification Modal */}
      <Modal
        isOpen={verifyingSkill !== null}
        onClose={() => setVerifyingSkill(null)}
        title={verifyingSkill ? `Review: ${verifyingSkill.title}` : "Review Skill"}
      >
        {verifyingSkill && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p>
                Current status:{" "}
                <strong>{PROFICIENCY_LABELS[verifyingSkill.proficiency]}</strong>
              </p>
              {verifyingSkill.member_notes && (
                <p>Swimmer note: &ldquo;{verifyingSkill.member_notes}&rdquo;</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVerifyAction("verify")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  verifyAction === "verify"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✓ Verify Skill
              </button>
              <button
                type="button"
                onClick={() => setVerifyAction("reject")}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                  verifyAction === "reject"
                    ? "border-rose-500 bg-rose-50 text-rose-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Needs More Practice
              </button>
            </div>

            {verifyAction === "verify" && (
              <Select
                label="Verified proficiency"
                value={verifyProficiency}
                onChange={(e) => setVerifyProficiency(e.target.value as SkillProficiency)}
              >
                {(["learning", "confident", "mastered"] as SkillProficiency[]).map((opt) => (
                  <option key={opt} value={opt}>
                    {PROFICIENCY_LABELS[opt]}
                  </option>
                ))}
              </Select>
            )}

            <Textarea
              label={
                verifyAction === "reject"
                  ? "Technique feedback (required — one TI cue to focus on)"
                  : "Coaching note (optional, private to swimmer & coaches)"
              }
              required={verifyAction === "reject"}
              placeholder="e.g. Clean side breath on right; next focus is exhaling smoothly before rotating left."
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setVerifyingSkill(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSaveVerification()} disabled={submitting}>
                {submitting
                  ? "Saving..."
                  : verifyAction === "verify"
                    ? "Confirm Verification"
                    : "Send Feedback"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
