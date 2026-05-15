// AgreementsTab — pool admin partnership agreements CRUD. Extracted from
// `src/components/admin/PoolEditTabs.tsx` during the file-size sweep.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MediaInput } from "@/components/ui/MediaInput";
import { getMediaUrl } from "@/lib/media";
import {
  PoolsApi,
  type PoolAgreement,
  type PoolAgreementCreate,
  type PoolAgreementStatus,
} from "@/lib/pools";
import { FileCheck2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, inputCls, toDateInput } from "./_shared";

const AGREEMENT_STATUSES: PoolAgreementStatus[] = [
  "draft",
  "active",
  "expired",
  "terminated",
];

export function AgreementsTab({ poolId }: { poolId: string }) {
  const [agreements, setAgreements] = useState<PoolAgreement[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PoolAgreement | null>(null);

  const load = useCallback(async () => {
    try {
      setAgreements(await PoolsApi.listAgreements(poolId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load agreements");
      setAgreements([]);
    }
  }, [poolId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agreement?")) return;
    try {
      await PoolsApi.deleteAgreement(poolId, id);
      toast.success("Agreement deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (agreements === null) return <Card className="p-6 text-sm text-slate-500">Loading agreements...</Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {agreements.length} {agreements.length === 1 ? "agreement" : "agreements"}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          New agreement
        </Button>
      </div>

      {(showForm || editing) && (
        <AgreementForm
          poolId={poolId}
          agreement={editing ?? undefined}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {agreements.length === 0 && !showForm ? (
        <EmptyState icon={FileCheck2} label="No agreements yet." />
      ) : (
        <div className="space-y-2">
          {agreements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{a.title}</h4>
                    <Badge
                      variant={
                        a.status === "active"
                          ? "success"
                          : a.status === "draft"
                            ? "default"
                            : "warning"
                      }
                      className="capitalize"
                    >
                      {a.status}
                    </Badge>
                    {a.is_exclusive && <Badge variant="info">Exclusive</Badge>}
                  </div>
                  <div className="text-sm text-slate-600 space-y-0.5">
                    {a.start_date && (
                      <div>
                        Term: {new Date(a.start_date).toLocaleDateString()}
                        {a.end_date && ` → ${new Date(a.end_date).toLocaleDateString()}`}
                      </div>
                    )}
                    {a.commission_percentage && (
                      <div>Commission: {a.commission_percentage}%</div>
                    )}
                    {a.flat_session_rate_ngn && (
                      <div>Flat rate: ₦{a.flat_session_rate_ngn}</div>
                    )}
                    {a.min_sessions_per_month && (
                      <div>Min sessions/month: {a.min_sessions_per_month}</div>
                    )}
                    {a.signed_doc_url && (
                      <a
                        href={a.signed_doc_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 hover:underline"
                      >
                        View signed document →
                      </a>
                    )}
                    {a.notes && <p className="text-xs text-slate-500 mt-1">{a.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditing(a)}
                    className="p-1.5 rounded hover:bg-slate-100"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded hover:bg-rose-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AgreementForm({
  poolId,
  agreement,
  onSaved,
  onCancel,
}: {
  poolId: string;
  agreement?: PoolAgreement;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PoolAgreementCreate>({
    title: agreement?.title ?? "",
    status: agreement?.status ?? "draft",
    start_date: toDateInput(agreement?.start_date ?? null),
    end_date: toDateInput(agreement?.end_date ?? null),
    signed_at: toDateInput(agreement?.signed_at ?? null),
    commission_percentage: agreement?.commission_percentage
      ? Number(agreement.commission_percentage)
      : null,
    flat_session_rate_ngn: agreement?.flat_session_rate_ngn
      ? Number(agreement.flat_session_rate_ngn)
      : null,
    min_sessions_per_month: agreement?.min_sessions_per_month ?? null,
    is_exclusive: agreement?.is_exclusive ?? false,
    signed_doc_url: agreement?.signed_doc_url ?? "",
    notes: agreement?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const payload: PoolAgreementCreate = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        // signed_at is a date input (YYYY-MM-DD); send as ISO datetime if set
        signed_at: form.signed_at ? `${form.signed_at}T00:00:00Z` : null,
        signed_doc_url: form.signed_doc_url || null,
        notes: form.notes || null,
      };
      if (agreement) {
        await PoolsApi.updateAgreement(poolId, agreement.id, payload);
        toast.success("Agreement updated");
      } else {
        await PoolsApi.createAgreement(poolId, payload);
        toast.success("Agreement created");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 border-cyan-200 bg-cyan-50/30 space-y-3">
      <h4 className="font-semibold text-slate-900">
        {agreement ? "Edit agreement" : "New agreement"}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
          <input
            className={inputCls}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. 2026 Partnership Agreement"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as PoolAgreementStatus })
            }
          >
            {AGREEMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm mt-6">
            <input
              type="checkbox"
              checked={form.is_exclusive ?? false}
              onChange={(e) => setForm({ ...form, is_exclusive: e.target.checked })}
            />
            Exclusive partnership
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Start date</label>
          <input
            type="date"
            className={inputCls}
            value={form.start_date ?? ""}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">End date</label>
          <input
            type="date"
            className={inputCls}
            value={form.end_date ?? ""}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Date signed
          </label>
          <input
            type="date"
            className={inputCls}
            value={form.signed_at ?? ""}
            onChange={(e) => setForm({ ...form, signed_at: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Commission %
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            className={inputCls}
            value={form.commission_percentage ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                commission_percentage: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Flat session rate (₦)
          </label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.flat_session_rate_ngn ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                flat_session_rate_ngn: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Min sessions/month
          </label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.min_sessions_per_month ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                min_sessions_per_month: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Signed document URL
          </label>
          <input
            type="url"
            className={inputCls}
            value={form.signed_doc_url ?? ""}
            onChange={(e) => setForm({ ...form, signed_doc_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea
            rows={2}
            className={inputCls}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving..." : agreement ? "Save" : "Create"}
        </Button>
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ASSETS TAB
// ═════════════════════════════════════════════════════════════════════════

