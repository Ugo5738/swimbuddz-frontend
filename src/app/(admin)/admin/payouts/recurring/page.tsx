"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  AcademyApi,
  type Cohort,
  type CohortComplexityScoreResponse,
} from "@/lib/academy";
import { formatDate, formatNaira } from "@/lib/format";
import {
  adminCreateRecurringPayout,
  adminListRecurringPayouts,
  adminPreviewRecurringPayout,
  adminRunRecurringPayoutNow,
  adminUpdateRecurringPayout,
  type PayoutPreview,
  type RecurringPayoutConfig,
  type RecurringPayoutStatus,
} from "@/lib/payouts";
import {
  CheckCircle,
  Eye,
  Pause,
  Play,
  Plus,
  Repeat,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_VARIANT: Record<
  RecurringPayoutStatus,
  "success" | "warning" | "info" | "danger" | "default"
> = {
  active: "success",
  paused: "warning",
  completed: "info",
  cancelled: "danger",
};

export default function AdminRecurringPayoutsPage() {
  const [configs, setConfigs] = useState<RecurringPayoutConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RecurringPayoutStatus | "">(
    "",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [previewConfig, setPreviewConfig] =
    useState<RecurringPayoutConfig | null>(null);
  const [preview, setPreview] = useState<PayoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function loadConfigs() {
    setLoading(true);
    try {
      const res = await adminListRecurringPayouts({
        status: statusFilter || undefined,
        page_size: 100,
      });
      setConfigs(res.items);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load recurring payout configs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigs();
  }, [statusFilter]);

  async function handlePreview(config: RecurringPayoutConfig) {
    setPreviewConfig(config);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const result = await adminPreviewRecurringPayout(config.id);
      setPreview(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Preview failed";
      toast.error(msg);
      setPreviewConfig(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRunNow(config: RecurringPayoutConfig) {
    if (
      !confirm(
        `Force-run block ${config.block_index + 1} of ${config.total_blocks} now? ` +
          `A PENDING coach payout row will be created and the schedule will advance. ` +
          `Approve & send via /admin/payouts after.`,
      )
    ) {
      return;
    }
    try {
      await adminRunRecurringPayoutNow(config.id);
      toast.success("Block run successfully — see /admin/payouts for the new row");
      await loadConfigs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Run-now failed";
      toast.error(msg);
    }
  }

  async function togglePauseResume(config: RecurringPayoutConfig) {
    const next: RecurringPayoutStatus =
      config.status === "active" ? "paused" : "active";
    try {
      await adminUpdateRecurringPayout(config.id, { status: next });
      toast.success(`Config ${next === "active" ? "resumed" : "paused"}`);
      await loadConfigs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Repeat className="h-6 w-6 text-cyan-600" />
            Recurring Coach Payouts
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Per-cohort policies that auto-create PENDING coach payouts at the
            end of each 4-week block. Approve and send each from{" "}
            <a href="/admin/payouts" className="underline">
              /admin/payouts
            </a>
            .
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New config
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Status:</label>
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as RecurringPayoutStatus | "")
            }
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </Card>

      {loading ? (
        <LoadingCard />
      ) : configs.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No recurring payout configs yet. Click <strong>New config</strong>{" "}
          above to create one.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">
                    Coach / Cohort
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">
                    Band %
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">
                    Block
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">
                    Next run
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-slate-600">
                        coach: {c.coach_member_id.slice(0, 8)}…
                      </div>
                      <div className="font-mono text-xs text-slate-600">
                        cohort: {c.cohort_id.slice(0, 8)}…
                      </div>
                      {c.notes && (
                        <div className="text-xs text-slate-500 mt-1 max-w-[280px] truncate">
                          {c.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {Number(c.band_percentage).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4">
                      {c.block_index} / {c.total_blocks}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(c.next_run_date)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex gap-2">
                        {c.status === "active" &&
                          c.block_index < c.total_blocks && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreview(c)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRunNow(c)}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Run now
                              </Button>
                            </>
                          )}
                        {(c.status === "active" || c.status === "paused") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePauseResume(c)}
                          >
                            {c.status === "active" ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateConfigModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadConfigs();
        }}
      />

      <PreviewModal
        config={previewConfig}
        preview={preview}
        loading={previewLoading}
        onClose={() => {
          setPreviewConfig(null);
          setPreview(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create modal
// ---------------------------------------------------------------------------

function CreateConfigModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  // Cohort selector data
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState(false);
  const [cohortFilter, setCohortFilter] = useState("");

  // Selected cohort + its derived data
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [score, setScore] = useState<CohortComplexityScoreResponse | null>(
    null,
  );
  const [scoreLoading, setScoreLoading] = useState(false);

  // Form fields
  const [coachMemberId, setCoachMemberId] = useState("");
  const [bandPercentage, setBandPercentage] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cohorts once when modal opens.
  useEffect(() => {
    if (!open || cohorts.length > 0) return;
    setCohortsLoading(true);
    AcademyApi.listCohorts()
      .then((items) => {
        // Sort: open + active first, then by start_date desc (most recent first)
        const priority: Record<string, number> = {
          active: 0,
          open: 1,
          completed: 2,
          cancelled: 3,
        };
        items.sort((a, b) => {
          const pa = priority[a.status] ?? 99;
          const pb = priority[b.status] ?? 99;
          if (pa !== pb) return pa - pb;
          return b.start_date.localeCompare(a.start_date);
        });
        setCohorts(items);
      })
      .catch(() => toast.error("Failed to load cohorts"))
      .finally(() => setCohortsLoading(false));
  }, [open, cohorts.length]);

  // When a cohort is selected, fetch its complexity score and pre-fill coach.
  useEffect(() => {
    if (!selectedCohort) {
      setScore(null);
      setBandPercentage("");
      return;
    }
    if (selectedCohort.coach_id) {
      setCoachMemberId(selectedCohort.coach_id);
    }
    setScoreLoading(true);
    AcademyApi.getCohortComplexityScore(selectedCohort.id)
      .then((s) => {
        setScore(s);
        // Default band % to the midpoint of the allowed range
        const mid = (s.pay_band_min + s.pay_band_max) / 2;
        setBandPercentage(mid.toFixed(2));
      })
      .catch(() => {
        setScore(null);
        toast.error(
          "Cohort has no complexity score — score it first via Academy → Cohorts.",
        );
      })
      .finally(() => setScoreLoading(false));
  }, [selectedCohort]);

  function reset() {
    setSelectedCohort(null);
    setCoachMemberId("");
    setBandPercentage("");
    setNotes("");
    setScore(null);
    setError(null);
    setCohortFilter("");
  }

  const filteredCohorts = useMemo(() => {
    const q = cohortFilter.trim().toLowerCase();
    if (!q) return cohorts;
    return cohorts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q),
    );
  }, [cohorts, cohortFilter]);

  const bandValid = (() => {
    if (!score || !bandPercentage) return true;
    const v = Number(bandPercentage);
    return v >= score.pay_band_min && v <= score.pay_band_max;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCohort) {
      setError("Pick a cohort first");
      return;
    }
    if (!score) {
      setError(
        "Cohort has no complexity score yet. Score the cohort before creating a recurring config.",
      );
      return;
    }
    if (!bandValid) {
      setError(
        `Band % must fall within the cohort band ${score.pay_band_min}-${score.pay_band_max}%.`,
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await adminCreateRecurringPayout({
        coach_member_id: coachMemberId.trim(),
        cohort_id: selectedCohort.id,
        band_percentage: bandPercentage,
        notes: notes.trim() || undefined,
      });
      toast.success("Recurring payout config created");
      reset();
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="New recurring payout config">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cohort picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cohort
          </label>
          <Input
            placeholder="Search cohort by name, status, or ID…"
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="mb-2"
          />
          <Select
            value={selectedCohort?.id ?? ""}
            onChange={(e) =>
              setSelectedCohort(
                cohorts.find((c) => c.id === e.target.value) ?? null,
              )
            }
            disabled={cohortsLoading}
            required
          >
            <option value="">
              {cohortsLoading
                ? "Loading…"
                : `— Pick a cohort (${filteredCohorts.length} shown) —`}
            </option>
            {filteredCohorts.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.status}] {c.name} — starts {c.start_date.slice(0, 10)}
              </option>
            ))}
          </Select>
        </div>

        {/* Cohort summary card */}
        {selectedCohort && (
          <Card className="p-3 bg-slate-50 text-xs space-y-1">
            <p>
              <strong>Cohort:</strong> {selectedCohort.name}
            </p>
            <p>
              <strong>Dates:</strong>{" "}
              {selectedCohort.start_date.slice(0, 10)} →{" "}
              {selectedCohort.end_date.slice(0, 10)}
            </p>
            {selectedCohort.coach_id && (
              <p>
                <strong>Assigned coach (member_id):</strong>{" "}
                <code>{selectedCohort.coach_id}</code>
              </p>
            )}
            {scoreLoading ? (
              <p className="text-slate-500">Loading complexity score…</p>
            ) : score ? (
              <p>
                <strong>Complexity:</strong> total {score.total_score} /{" "}
                {score.required_coach_grade.replace("grade_", "Grade ")} → band{" "}
                {score.pay_band_min}–{score.pay_band_max}%
              </p>
            ) : (
              <p className="text-rose-700">
                No complexity score yet — score the cohort first.
              </p>
            )}
          </Card>
        )}

        {/* Coach (auto-filled from cohort, can override) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Coach member ID
          </label>
          <Input
            placeholder="UUID — auto-filled from cohort if assigned"
            value={coachMemberId}
            onChange={(e) => setCoachMemberId(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1">
            Defaults to the cohort's assigned coach. Override only if a
            different coach is delivering this cohort under a coach_assignments
            row.
          </p>
        </div>

        {/* Band % with cohort-derived range hint */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Band percentage{" "}
            {score && (
              <span className="text-xs font-normal text-slate-500">
                (must be {score.pay_band_min}–{score.pay_band_max})
              </span>
            )}
          </label>
          <Input
            type="number"
            step="0.01"
            min={score?.pay_band_min ?? 0.01}
            max={score?.pay_band_max ?? 100}
            value={bandPercentage}
            onChange={(e) => setBandPercentage(e.target.value)}
            required
            className={!bandValid ? "border-rose-400" : ""}
          />
          {!bandValid && score && (
            <p className="text-xs text-rose-700 mt-1">
              Outside cohort band {score.pay_band_min}–{score.pay_band_max}%.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes (optional)
          </label>
          <Textarea
            placeholder="e.g. Mid-band: rewards 3yr coaching experience"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !selectedCohort || !score || !bandValid}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Preview modal
// ---------------------------------------------------------------------------

function PreviewModal({
  config,
  preview,
  loading,
  onClose,
}: {
  config: RecurringPayoutConfig | null;
  preview: PayoutPreview | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!config) return null;

  return (
    <Modal
      isOpen={!!config}
      onClose={onClose}
      title={`Preview block ${config.block_index + 1} / ${config.total_blocks}`}
    >
      {loading ? (
        <p className="text-slate-500">Computing…</p>
      ) : !preview ? (
        <p className="text-slate-500">No preview available.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Block window</p>
              <p className="font-medium">
                {formatDate(preview.block_start)} →{" "}
                {formatDate(preview.block_end)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Per-session rate</p>
              <p className="font-medium">
                {formatNaira(preview.per_session_amount_kobo / 100)} per
                student-session
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-slate-500">
                    Student
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">
                    Delivered
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">
                    Excused
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">
                    Make-ups
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-500">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((line) => (
                  <tr key={line.student_member_id} className="border-b">
                    <td className="py-2 px-3">
                      {line.student_name ?? line.student_member_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {line.sessions_delivered}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {line.sessions_excused}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {line.makeups_completed_in_block}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatNaira(line.student_total_kobo / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-2 px-3" colSpan={4}>
                    Total
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatNaira(preview.total_kobo / 100)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <Alert variant="info">
            <CheckCircle className="h-4 w-4 inline mr-1" />
            This is a dry-run. Click <strong>Run now</strong> on the row to
            actually create a PENDING coach payout (or wait for the daily
            cron at 02:15 UTC).
          </Alert>
        </div>
      )}
    </Modal>
  );
}
