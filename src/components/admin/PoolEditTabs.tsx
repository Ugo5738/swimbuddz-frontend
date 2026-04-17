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
  type PoolAsset,
  type PoolAssetCreate,
  type PoolAssetType,
  type PoolContact,
  type PoolContactCreate,
  type PoolContactRole,
  type PoolStatusChange,
  type PoolVisit,
  type PoolVisitCreate,
  type PoolVisitType,
} from "@/lib/pools";
import {
  FileCheck2,
  Image as ImageIcon,
  MessageSquare,
  Pencil,
  Plus,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Shared UI atoms ────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white";

function EmptyState({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) {
  return (
    <Card className="p-8 text-center border-dashed">
      <Icon className="mx-auto h-10 w-10 text-slate-300 mb-2" />
      <p className="text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.length >= 10 ? iso.slice(0, 10) : "";
}

// ═════════════════════════════════════════════════════════════════════════
// CONTACTS TAB
// ═════════════════════════════════════════════════════════════════════════

const CONTACT_ROLES: PoolContactRole[] = [
  "owner",
  "manager",
  "front_desk",
  "accountant",
  "operations",
  "marketing",
  "other",
];

export function ContactsTab({ poolId }: { poolId: string }) {
  const [contacts, setContacts] = useState<PoolContact[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PoolContact | null>(null);

  const load = useCallback(async () => {
    try {
      setContacts(await PoolsApi.listContacts(poolId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load contacts");
      setContacts([]);
    }
  }, [poolId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this contact?")) return;
    try {
      await PoolsApi.deleteContact(poolId, id);
      toast.success("Contact removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (contacts === null) return <Card className="p-6 text-sm text-slate-500">Loading contacts...</Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add contact
        </Button>
      </div>

      {showForm && !editing && (
        <ContactForm
          poolId={poolId}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {contacts.length === 0 && !showForm ? (
        <EmptyState icon={Users} label="No contacts yet. Add the manager, owner, or front desk." />
      ) : (
        <div className="space-y-2">
          {contacts.map((c) =>
            editing?.id === c.id ? (
              <ContactForm
                key={c.id}
                poolId={poolId}
                contact={c}
                onSaved={() => {
                  setEditing(null);
                  load();
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{c.name}</h4>
                      <Badge variant="default" className="capitalize">
                        {c.role.replace("_", " ")}
                      </Badge>
                      {c.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Star className="h-3 w-3" />
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 space-y-0.5">
                      {c.phone && <div>Phone: {c.phone}</div>}
                      {c.whatsapp && <div>WhatsApp: {c.whatsapp}</div>}
                      {c.email && <div>Email: {c.email}</div>}
                      {c.notes && <div className="text-xs text-slate-500 mt-1">{c.notes}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(c)}
                      className="p-1.5 rounded hover:bg-slate-100"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded hover:bg-rose-50"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function ContactForm({
  poolId,
  contact,
  onSaved,
  onCancel,
}: {
  poolId: string;
  contact?: PoolContact;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PoolContactCreate>({
    name: contact?.name ?? "",
    role: contact?.role ?? "manager",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    whatsapp: contact?.whatsapp ?? "",
    notes: contact?.notes ?? "",
    is_primary: contact?.is_primary ?? false,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        phone: form.phone || null,
        email: form.email || null,
        whatsapp: form.whatsapp || null,
        notes: form.notes || null,
      };
      if (contact) {
        await PoolsApi.updateContact(poolId, contact.id, payload);
        toast.success("Contact updated");
      } else {
        await PoolsApi.createContact(poolId, payload);
        toast.success("Contact added");
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
        {contact ? "Edit contact" : "New contact"}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
          <select
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as PoolContactRole })}
          >
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            type="tel"
            className={inputCls}
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
          <input
            type="tel"
            className={inputCls}
            value={form.whatsapp ?? ""}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            className={inputCls}
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_primary ?? false}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            Primary contact for this pool
          </label>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving..." : contact ? "Save" : "Add"}
        </Button>
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// VISITS TAB
// ═════════════════════════════════════════════════════════════════════════

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

export function HistoryTab({ poolId }: { poolId: string }) {
  const [changes, setChanges] = useState<PoolStatusChange[] | null>(null);

  useEffect(() => {
    PoolsApi.listStatusHistory(poolId)
      .then(setChanges)
      .catch(() => setChanges([]));
  }, [poolId]);

  if (changes === null) return <Card className="p-6 text-sm text-slate-500">Loading history...</Card>;
  if (changes.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        label="No status changes yet. Changes are logged automatically when you update partnership status."
      />
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((c) => (
        <Card key={c.id} className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400">
              {new Date(c.created_at).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              {c.from_status && (
                <>
                  <span className="text-sm text-slate-600 capitalize">
                    {c.from_status.replace("_", " ")}
                  </span>
                  <span className="text-slate-400">→</span>
                </>
              )}
              <span className="text-sm font-semibold text-slate-900 capitalize">
                {c.to_status.replace("_", " ")}
              </span>
            </div>
          </div>
          {c.reason && <p className="mt-1 text-sm text-slate-600">{c.reason}</p>}
        </Card>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// AGREEMENTS TAB
// ═════════════════════════════════════════════════════════════════════════

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

const ASSET_TYPES: PoolAssetType[] = ["photo", "document", "video", "certificate", "other"];

export function AssetsTab({ poolId }: { poolId: string }) {
  const [assets, setAssets] = useState<PoolAsset[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setAssets(await PoolsApi.listAssets(poolId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load assets");
      setAssets([]);
    }
  }, [poolId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this asset?")) return;
    try {
      await PoolsApi.deleteAsset(poolId, id);
      toast.success("Asset removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const setPrimary = async (id: string) => {
    try {
      await PoolsApi.updateAsset(poolId, id, { is_primary: true });
      toast.success("Set as primary");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (assets === null) return <Card className="p-6 text-sm text-slate-500">Loading assets...</Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {assets.length} {assets.length === 1 ? "asset" : "assets"}
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add asset
        </Button>
      </div>

      {showForm && (
        <AssetForm
          poolId={poolId}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {assets.length === 0 && !showForm ? (
        <EmptyState
          icon={ImageIcon}
          label="No assets yet. Add pool photos, signed documents, or certificates."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              onSetPrimary={() => setPrimary(a.id)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onSetPrimary,
  onDelete,
}: {
  asset: PoolAsset;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  // Resolve media_id to a real URL. Direct `url` is used as-is.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(asset.url);

  useEffect(() => {
    let cancelled = false;
    if (asset.media_id && !asset.url) {
      getMediaUrl(asset.media_id)
        .then((u) => {
          if (!cancelled) setResolvedUrl(u);
        })
        .catch(() => {
          if (!cancelled) setResolvedUrl(null);
        });
    } else {
      setResolvedUrl(asset.url);
    }
    return () => {
      cancelled = true;
    };
  }, [asset.media_id, asset.url]);

  const isPhoto = asset.asset_type === "photo" || asset.asset_type === "certificate";
  const isVideo = asset.asset_type === "video";

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        {isPhoto && resolvedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={asset.title ?? "pool asset"}
            className="w-20 h-20 rounded-lg object-cover border border-slate-200"
          />
        ) : isVideo && resolvedUrl ? (
          <video
            src={resolvedUrl}
            className="w-20 h-20 rounded-lg object-cover border border-slate-200"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-slate-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 mb-1">
            <Badge variant="default" className="capitalize text-xs">
              {asset.asset_type}
            </Badge>
            {asset.is_primary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                <Star className="h-3 w-3" />
                Primary
              </span>
            )}
          </div>
          {asset.title && (
            <h4 className="font-semibold text-sm text-slate-900">{asset.title}</h4>
          )}
          {asset.caption && (
            <p className="text-xs text-slate-500 line-clamp-2">{asset.caption}</p>
          )}
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-600 hover:underline"
            >
              Open →
            </a>
          )}
          <div className="flex gap-1 mt-2">
            {!asset.is_primary && (
              <button
                onClick={onSetPrimary}
                className="text-xs text-slate-600 hover:text-amber-600"
              >
                Make primary
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-xs text-rose-600 hover:underline ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AssetForm({
  poolId,
  onSaved,
  onCancel,
}: {
  poolId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PoolAssetCreate>({
    asset_type: "photo",
    media_id: null,
    url: "",
    title: "",
    caption: "",
    is_primary: false,
    display_order: 0,
  });
  const [busy, setBusy] = useState(false);

  // `accept` hint for the file picker based on asset type
  const acceptFor = (t: PoolAssetType): string => {
    switch (t) {
      case "photo":
        return "image/*";
      case "video":
        return "video/*";
      case "document":
        return "application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";
      case "certificate":
        return "image/*,application/pdf";
      default:
        return "";
    }
  };

  // The media_service purpose to use. For videos we use product_video
  // (which allows large files), for everything else "general".
  const purposeFor = (t: PoolAssetType) =>
    t === "video" ? "product_video" : "general";

  const save = async () => {
    if (!form.media_id && !form.url?.trim()) {
      toast.error("Upload a file or paste a URL first");
      return;
    }
    setBusy(true);
    try {
      await PoolsApi.createAsset(poolId, {
        ...form,
        title: form.title || null,
        caption: form.caption || null,
        url: form.url || null,
        media_id: form.media_id || null,
        display_order: form.display_order ?? 0,
      });
      toast.success("Asset added");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 border-cyan-200 bg-cyan-50/30 space-y-3">
      <h4 className="font-semibold text-slate-900">Add asset</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select
            className={inputCls}
            value={form.asset_type}
            onChange={(e) => {
              // Clearing media_id/url when switching type prevents mixing
              // a video file with asset_type=photo, etc.
              setForm({
                ...form,
                asset_type: e.target.value as PoolAssetType,
                media_id: null,
                url: "",
              });
            }}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Display order
          </label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.display_order ?? 0}
            onChange={(e) =>
              setForm({
                ...form,
                display_order: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
          <p className="mt-1 text-xs text-slate-500">
            Lower numbers appear first in the gallery.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_primary ?? false}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            Primary asset
          </label>
        </div>

        {/* Media (upload OR URL) */}
        <div className="sm:col-span-2">
          <MediaInput
            purpose={purposeFor(form.asset_type ?? "photo")}
            mode="both"
            accept={acceptFor(form.asset_type ?? "photo")}
            value={form.media_id ?? null}
            label={
              form.asset_type === "video"
                ? "Upload video or paste URL"
                : form.asset_type === "document"
                  ? "Upload document or paste URL"
                  : "Upload file or paste URL"
            }
            onChange={(mediaId, fileUrl) => {
              // When user uploads: media_id is set, url cleared (use media_id).
              // When user registers a URL, media_service returns media_id too
              // (see registerMediaUrl) — so we keep media_id as the source of truth.
              setForm((prev) => ({
                ...prev,
                media_id: mediaId,
                // Keep url only if we don't have a media_id (shouldn't happen normally)
                url: mediaId ? null : fileUrl ?? null,
              }));
            }}
            onError={(err) => {
              if (err) toast.error(err);
            }}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <input
            className={inputCls}
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Caption</label>
          <textarea
            rows={2}
            className={inputCls}
            value={form.caption ?? ""}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Add"}
        </Button>
      </div>
    </Card>
  );
}
