"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import type {
  CompetencyEvidenceRecord,
  CompetencyStatus,
} from "@/lib/academy/competency-passport";

const statusLabel: Record<CompetencyStatus, string> = {
  verified: "Verified",
  expired: "Needs renewal",
  recheck_required: "Needs reassessment",
  revoked: "Verification withdrawn",
};

const statusBadge: Record<CompetencyStatus, string> = {
  verified: "bg-emerald-100 text-emerald-900",
  expired: "bg-amber-100 text-amber-900",
  recheck_required: "bg-amber-100 text-amber-900",
  revoked: "bg-rose-100 text-rose-900",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface IssuedVerificationsPanelProps {
  verifications: CompetencyEvidenceRecord[];
  busy: boolean;
  onRevoke: (verificationId: string, reason: string) => Promise<void>;
}

export function IssuedVerificationsPanel({
  verifications,
  busy,
  onRevoke,
}: IssuedVerificationsPanelProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  if (verifications.length === 0) {
    return (
      <Card className="p-6 text-sm text-slate-600">
        No competency verifications issued for the current filter yet.
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {verifications.map((record) => {
        const isRevoking = revokingId === record.id;
        return (
          <li
            key={record.id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{record.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge[record.status]}`}
                  >
                    {statusLabel[record.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {record.code ?? "—"} · Member Auth:{" "}
                  <code>{record.member_auth_id ?? "—"}</code> · Verified{" "}
                  {formatDate(record.verified_at)}
                  {record.expires_at ? ` · Expires ${formatDate(record.expires_at)}` : ""}
                </p>
                {record.status_reason && (
                  <p className="text-xs text-amber-900">
                    Status note: {record.status_reason}
                  </p>
                )}
                {record.review_notes && (
                  <p className="text-xs text-slate-600">
                    Audit note: {record.review_notes}
                  </p>
                )}
              </div>
              {record.status !== "revoked" && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setRevokingId(isRevoking ? null : record.id);
                    setRevokeReason("");
                  }}
                >
                  {isRevoking ? "Cancel" : "Revoke"}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {record.criteria_passed.map((criterion) => (
                <span
                  key={criterion}
                  className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                >
                  <code>{criterion}</code>
                </span>
              ))}
            </div>

            {isRevoking && (
              <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                <Textarea
                  label={`Formal revocation reason (${revokeReason.trim().length}/20 min chars)`}
                  name="revoke-reason"
                  required
                  minLength={20}
                  rows={2}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Explain why this verification is being withdrawn..."
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || revokeReason.trim().length < 20}
                    onClick={async () => {
                      await onRevoke(record.id, revokeReason.trim());
                      setRevokingId(null);
                      setRevokeReason("");
                    }}
                  >
                    Confirm Permanent Revocation
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRevokingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
