// VisitsTab — pool admin visit log. Extracted from
// `src/components/admin/PoolEditTabs.tsx` during the file-size sweep.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PoolsApi, type PoolVisit, type PoolVisitCreate, type PoolVisitType } from "@/lib/pools";
import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, inputCls, toDateInput } from "./_shared";

const VISIT_TYPES: PoolVisitType[] = [
  "scouting",
  "evaluation",
  "partnership_meeting",
  "session_check",
  "incident",
  "other",
];

export function VisitsTab({ poolId }: { poolId: string }) {
  const [visits, setVisits] = useState<PoolVisit[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setVisits(await PoolsApi.listVisits(poolId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load visits");
      setVisits([]);
    }
  }, [poolId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this visit log entry?")) return;
    try {
      await PoolsApi.deleteVisit(poolId, id);
      toast.success("Visit deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggleFollowUp = async (v: PoolVisit) => {
    try {
      await PoolsApi.updateVisit(poolId, v.id, {
        follow_up_completed: !v.follow_up_completed,
      });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (visits === null) return <Card className="p-6 text-sm text-slate-500">Loading visits...</Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {visits.length} logged {visits.length === 1 ? "visit" : "visits"}
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Log visit
        </Button>
      </div>

      {showForm && (
        <VisitForm
          poolId={poolId}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {visits.length === 0 && !showForm ? (
        <EmptyState
          icon={MessageSquare}
          label="No visits logged yet. Record your first site visit or meeting."
        />
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="default" className="capitalize">
                      {v.visit_type.replace("_", " ")}
                    </Badge>
                    <span className="text-sm text-slate-500">
                      {new Date(v.visit_date).toLocaleDateString()}
                    </span>
                    {v.visitor_display_name && (
                      <span className="text-xs text-slate-400">
                        by {v.visitor_display_name}
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">{v.summary}</h4>
                  {v.notes && <p className="text-sm text-slate-600 mb-2">{v.notes}</p>}
                  {v.follow_up_action && (
                    <div
                      className={`mt-2 rounded-lg px-3 py-2 text-sm border ${
                        v.follow_up_completed
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={v.follow_up_completed}
                          onChange={() => toggleFollowUp(v)}
                        />
                        <span>
                          <strong>Follow-up:</strong> {v.follow_up_action}
                          {v.follow_up_due_at && (
                            <span className="text-xs opacity-75">
                              {" "}
                              (due {new Date(v.follow_up_due_at).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </label>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="p-1.5 rounded hover:bg-rose-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VisitForm({
  poolId,
  onSaved,
  onCancel,
}: {
  poolId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<PoolVisitCreate>({
    visit_date: today,
    visit_type: "scouting",
    summary: "",
    notes: "",
    follow_up_action: "",
    follow_up_due_at: null,
    follow_up_completed: false,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.summary.trim()) {
      toast.error("Summary is required");
      return;
    }
    setBusy(true);
    try {
      await PoolsApi.createVisit(poolId, {
        ...form,
        notes: form.notes || null,
        follow_up_action: form.follow_up_action || null,
        follow_up_due_at: form.follow_up_due_at || null,
      });
      toast.success("Visit logged");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 border-cyan-200 bg-cyan-50/30 space-y-3">
      <h4 className="font-semibold text-slate-900">Log a visit</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
          <input
            type="date"
            className={inputCls}
            value={form.visit_date}
            onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select
            className={inputCls}
            value={form.visit_type}
            onChange={(e) => setForm({ ...form, visit_type: e.target.value as PoolVisitType })}
          >
            {VISIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Summary *
          </label>
          <input
            className={inputCls}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="e.g. Met owner, toured pool, discussed partnership"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea
            rows={3}
            className={inputCls}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Follow-up action
          </label>
          <input
            className={inputCls}
            value={form.follow_up_action ?? ""}
            onChange={(e) => setForm({ ...form, follow_up_action: e.target.value })}
            placeholder="e.g. Send partnership proposal"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Follow-up due
          </label>
          <input
            type="date"
            className={inputCls}
            value={form.follow_up_due_at ?? ""}
            onChange={(e) => setForm({ ...form, follow_up_due_at: e.target.value || null })}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Log visit"}
        </Button>
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// STATUS HISTORY TAB
// ═════════════════════════════════════════════════════════════════════════

