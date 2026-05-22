"use client";

/**
 * Standalone volunteer-opportunity templates (Phase 4 / §C2 of the
 * design doc). For session-linked recurring needs see the
 * SessionTemplate "Volunteer needs" section in the admin sessions page —
 * this tab is only for opportunities not tied to a session.
 */

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  TIER_LABELS,
  VolunteersApi,
  type VolunteerOpportunityTemplate,
  type VolunteerRole,
} from "@/lib/volunteers";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface FormState {
  id: string | null;
  title: string;
  description: string;
  role_id: string;
  day_of_week: string;
  start_time: string;
  duration_minutes: string;
  location_name: string;
  slots_needed: string;
  opportunity_type: "open_claim" | "approval_required";
  min_tier: "tier_1" | "tier_2" | "tier_3";
  cancellation_deadline_hours: string;
  auto_generate: boolean;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  description: "",
  role_id: "",
  day_of_week: "0",
  start_time: "09:00",
  duration_minutes: "60",
  location_name: "",
  slots_needed: "1",
  opportunity_type: "open_claim",
  min_tier: "tier_1",
  cancellation_deadline_hours: "24",
  auto_generate: false,
  is_active: true,
};

export function VolunteerTemplatesTab({
  roles,
  onOpportunitiesChanged,
}: {
  roles: VolunteerRole[];
  /** Fired after the admin generates concrete opportunities from a
   * template, so the parent page can refresh its `opportunities` state.
   * Otherwise the Opportunities tab silently stays stale until next
   * page load. Optional for callers that don't care. */
  onOpportunitiesChanged?: () => void | Promise<void>;
}) {
  const [templates, setTemplates] = useState<VolunteerOpportunityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [materialiseTarget, setMaterialiseTarget] = useState<VolunteerOpportunityTemplate | null>(
    null
  );
  const [materialiseThrough, setMaterialiseThrough] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await VolunteersApi.admin.listOpportunityTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (t: VolunteerOpportunityTemplate) => {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      role_id: t.role_id,
      day_of_week: String(t.day_of_week),
      start_time: t.start_time.slice(0, 5),
      duration_minutes: String(t.duration_minutes),
      location_name: t.location_name ?? "",
      slots_needed: String(t.slots_needed),
      opportunity_type: t.opportunity_type,
      min_tier: t.min_tier,
      cancellation_deadline_hours: String(t.cancellation_deadline_hours),
      auto_generate: t.auto_generate,
      is_active: t.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      role_id: form.role_id,
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time,
      duration_minutes: parseInt(form.duration_minutes),
      location_name: form.location_name || null,
      slots_needed: parseInt(form.slots_needed),
      opportunity_type: form.opportunity_type,
      min_tier: form.min_tier,
      cancellation_deadline_hours: parseInt(form.cancellation_deadline_hours),
      auto_generate: form.auto_generate,
      is_active: form.is_active,
    };
    try {
      if (form.id) {
        await VolunteersApi.admin.updateOpportunityTemplate(form.id, payload);
      } else {
        await VolunteersApi.admin.createOpportunityTemplate(payload);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Could not save template.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (t: VolunteerOpportunityTemplate) => {
    if (!confirm(`Delete template "${t.title}"?`)) return;
    try {
      await VolunteersApi.admin.deleteOpportunityTemplate(t.id);
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete template.");
    }
  };

  const handleMaterialise = async () => {
    if (!materialiseTarget || !materialiseThrough) return;
    try {
      const resp = await VolunteersApi.admin.materialiseOpportunityTemplate(
        materialiseTarget.id,
        materialiseThrough
      );
      toast.success(
        resp.created_count > 0
          ? `Created ${resp.created_count} opportunities through ${materialiseThrough}.`
          : `Nothing to create — opportunities already exist through ${resp.last_materialised_through}.`
      );
      setMaterialiseTarget(null);
      setMaterialiseThrough("");
      await refresh();
      // Tell the parent page to re-fetch its opportunities list. Without
      // this, the Opportunities tab silently stays on its mount-time
      // snapshot — the very confusion that triggered this fix.
      if (resp.created_count > 0 && onOpportunitiesChanged) {
        await onOpportunitiesChanged();
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not generate opportunities.");
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-slate-900">Opportunity templates</h3>
          <p className="text-xs text-slate-500 mt-1">
            Recurring volunteer needs that aren't tied to a specific session (e.g. weekly community
            outreach). Templates attached to session schedules live in the session template editor.
          </p>
        </div>
        <Button onClick={openCreate} className="flex-shrink-0 self-start whitespace-nowrap">
          <Plus className="mr-1 h-4 w-4" /> New template
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
      ) : templates.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-slate-500">No standalone volunteer templates yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className={t.is_active ? "" : "opacity-60"}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 text-sm">{t.title}</h4>
                      {!t.is_active && <Badge variant="default">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {DAY_LABELS[t.day_of_week]} at {t.start_time.slice(0, 5)} ·{" "}
                      {t.duration_minutes}min
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(t)}
                      className="text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t)}
                      className="text-xs text-rose-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  <span>{t.role_title ?? "Unknown role"}</span>
                  <span>·</span>
                  <span>
                    {t.slots_needed} slot{t.slots_needed === 1 ? "" : "s"}
                  </span>
                  <span>·</span>
                  <span>{TIER_LABELS[t.min_tier]}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {t.last_materialised_through
                      ? `Opportunities generated through ${t.last_materialised_through}`
                      : "No opportunities generated yet"}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMaterialiseTarget(t);
                      const d = new Date();
                      d.setDate(d.getDate() + 28); // default 4 weeks ahead
                      setMaterialiseThrough(d.toISOString().slice(0, 10));
                    }}
                    className="text-xs"
                  >
                    Generate…
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? "Edit Volunteer Template" : "Create Volunteer Template"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Select
              label="Role"
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              required
            >
              <option value="">— Pick role —</option>
              {roles
                .filter((r) => r.is_active)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.icon} {r.title}
                  </option>
                ))}
            </Select>
            <Input
              label="Slots Needed"
              type="number"
              min={1}
              value={form.slots_needed}
              onChange={(e) => setForm({ ...form, slots_needed: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <Select
              label="Day of Week"
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
            >
              {DAY_LABELS.map((d, idx) => (
                <option key={d} value={idx}>
                  {d}
                </option>
              ))}
            </Select>
            <Input
              label="Start Time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
            />
            <Input
              label="Duration (min)"
              type="number"
              min={15}
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              required
            />
          </div>
          <Input
            label="Location"
            value={form.location_name}
            onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            placeholder="e.g., Community Centre, Yaba"
          />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Select
              label="Claim Type"
              value={form.opportunity_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  opportunity_type: e.target.value as "open_claim" | "approval_required",
                })
              }
            >
              <option value="open_claim">Open</option>
              <option value="approval_required">Approval required</option>
            </Select>
            <Select
              label="Minimum Tier"
              value={form.min_tier}
              onChange={(e) =>
                setForm({
                  ...form,
                  min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
                })
              }
            >
              <option value="tier_1">Tier 1</option>
              <option value="tier_2">Tier 2</option>
              <option value="tier_3">Tier 3</option>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.auto_generate}
                onChange={(e) => setForm({ ...form, auto_generate: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              Auto-generate weekly
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : form.id ? "Save changes" : "Create template"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Materialise modal */}
      <Modal
        isOpen={!!materialiseTarget}
        onClose={() => setMaterialiseTarget(null)}
        title={`Generate opportunities — ${materialiseTarget?.title ?? ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Generate real volunteer opportunities for this template up to and including the chosen
            date. Dates that already have an opportunity for this role are skipped, so it's safe to
            run this more than once.
          </p>
          <Input
            label="Through date"
            type="date"
            value={materialiseThrough}
            onChange={(e) => setMaterialiseThrough(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setMaterialiseTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleMaterialise} disabled={!materialiseThrough}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
