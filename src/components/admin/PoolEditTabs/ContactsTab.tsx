// ContactsTab — pool admin contacts CRUD. Extracted from
// `src/components/admin/PoolEditTabs.tsx` during the file-size sweep.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  PoolsApi,
  type PoolContact,
  type PoolContactCreate,
  type PoolContactRole,
} from "@/lib/pools";
import { Pencil, Plus, Star, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, inputCls } from "./_shared";

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

