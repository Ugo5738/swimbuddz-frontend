// Extracted from `src/app/(admin)/admin/sessions/page.tsx` during the
// file-size sweep. The drawer + its inline form live together because the
// drawer toggles between "list" and "form" views — splitting them across
// files would just mean two imports for one user-visible widget. Both
// components are pure props-driven.

"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { SessionTemplateVolunteerSlotsSection } from "@/components/admin/SessionTemplateVolunteerSlotsSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Calendar, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { IBtn } from "@/app/(admin)/admin/sessions/components";
import type { RideArea, Template } from "@/app/(admin)/admin/sessions/types";
import { DAY_NAMES, locationLabel } from "@/app/(admin)/admin/sessions/utils";

export function TemplatesDrawer({
  templates,
  rideAreas,
  templateForm,
  editingTemplate,
  onClose,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onGenerate,
  onOpenForm,
}: {
  templates: Template[];
  rideAreas: RideArea[];
  templateForm: "create" | "edit" | null;
  editingTemplate: Template | null;
  onClose: () => void;
  onCreateTemplate: (data: any) => void;
  onUpdateTemplate: (id: string, data: any) => void;
  onDeleteTemplate: (id: string) => void;
  onGenerate: (t: Template) => void;
  onOpenForm: (mode: "create" | "edit", tmpl?: Template) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Session Templates</h2>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {templateForm ? (
            <TemplateFormInline
              mode={templateForm}
              template={editingTemplate}
              rideAreas={rideAreas}
              onCancel={() => onOpenForm(null as any)}
              onCreate={onCreateTemplate}
              onUpdate={onUpdateTemplate}
            />
          ) : (
            <>
              <Button
                onClick={() => onOpenForm("create")}
                className="mb-4 flex w-full items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> New Template
              </Button>

              {templates.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No templates yet. Create one to generate recurring sessions.
                </p>
              ) : (
                <div className="space-y-3">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{t.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {DAY_NAMES[t.day_of_week]} at {t.start_time} &middot;{" "}
                            {t.duration_minutes}min
                          </p>
                          <p className="text-xs text-slate-500">
                            {locationLabel(t.location)} &middot; N{t.pool_fee} &middot; {t.capacity}{" "}
                            cap
                          </p>
                        </div>
                        <IBtn
                          title="Delete template"
                          className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onDeleteTemplate(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IBtn>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onGenerate(t)}
                          className="flex items-center gap-1"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Generate
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpenForm("edit", t)}
                          className="flex items-center gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template form (rendered inline within the drawer)
// ---------------------------------------------------------------------------

function TemplateFormInline({
  mode,
  template,
  rideAreas,
  onCancel,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  template: Template | null;
  rideAreas: RideArea[];
  onCancel: () => void;
  onCreate: (data: any) => void;
  onUpdate: (id: string, data: any) => void;
}) {
  const [form, setForm] = useState({
    title: template?.title || "",
    session_type: template?.session_type || "club",
    // Prefer pool_id; legacy `location` enum kept for pre-registry templates.
    pool_id: template?.pool_id ?? null,
    location: template?.location || null,
    location_name: template?.location_name ?? null,
    day_of_week: template?.day_of_week ?? 5,
    start_time: template?.start_time || "09:00",
    duration_minutes: template?.duration_minutes || 180,
    pool_fee: template?.pool_fee || 2000,
    capacity: template?.capacity || 20,
    auto_generate: template?.auto_generate || false,
  });

  const [rideConfigs, setRideConfigs] = useState<
    Array<{ ride_area_id: string; cost: number; capacity: number }>
  >(
    template?.ride_share_config && Array.isArray(template.ride_share_config)
      ? template.ride_share_config.map((c: any) => ({
          ride_area_id: c.ride_area_id || "",
          cost: c.cost || 0,
          capacity: c.capacity || 4,
        }))
      : []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      ride_share_config: rideConfigs
        .filter((c) => c.ride_area_id)
        .map((c) => ({
          ride_area_id: c.ride_area_id,
          cost: parseFloat(c.cost as any) || 0,
          capacity: parseInt(c.capacity as any) || 4,
        })),
    };
    if (mode === "edit" && template) {
      onUpdate(template.id, data);
    } else {
      onCreate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-slate-900">
        {mode === "create" ? "New Template" : "Edit Template"}
      </h3>
      <Input
        label="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
      />
      <Select
        label="Session Type"
        value={form.session_type}
        onChange={(e) => setForm({ ...form, session_type: e.target.value })}
      >
        <option value="club">Club</option>
        <option value="cohort_class">Academy / Cohort Class</option>
        <option value="community">Community</option>
        <option value="event">Event</option>
      </Select>
      <Select
        label="Day of Week"
        value={form.day_of_week.toString()}
        onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
      >
        {DAY_NAMES.map((d, i) => (
          <option key={i} value={i}>
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
      <PoolPicker
        label="Pool"
        value={form.pool_id}
        onChange={(poolId, poolName) =>
          setForm({
            ...form,
            pool_id: poolId,
            location_name: poolName ?? null,
          })
        }
        hint="Templates inherit the pool for every session they generate."
      />
      <Input
        label="Duration (minutes)"
        type="number"
        value={form.duration_minutes}
        onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Pool Fee (N)"
          type="number"
          value={form.pool_fee}
          onChange={(e) => setForm({ ...form, pool_fee: parseInt(e.target.value) || 0 })}
        />
        <Input
          label="Capacity"
          type="number"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
        />
      </div>

      {/* Ride share config */}
      <div className="border-t border-slate-200 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Ride Share (optional)</span>
          <button
            type="button"
            onClick={() =>
              setRideConfigs((p) => [...p, { ride_area_id: "", cost: 1000, capacity: 4 }])
            }
            className="text-sm text-cyan-600 hover:text-cyan-800"
          >
            + Add
          </button>
        </div>
        {rideConfigs.map((cfg, i) => (
          <div key={i} className="mb-2 rounded border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Area {i + 1}</span>
              <button
                type="button"
                onClick={() => setRideConfigs((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Area"
                value={cfg.ride_area_id}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, ride_area_id: e.target.value };
                  setRideConfigs(next);
                }}
              >
                <option value="">--</option>
                {rideAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Cost"
                type="number"
                value={cfg.cost}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, cost: parseFloat(e.target.value) };
                  setRideConfigs(next);
                }}
              />
              <Input
                label="Seats"
                type="number"
                value={cfg.capacity}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, capacity: parseInt(e.target.value) };
                  setRideConfigs(next);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Volunteer needs editor — only on edit (slots are scoped to a
          saved template id). */}
      {mode === "edit" && template && (
        <SessionTemplateVolunteerSlotsSection sessionTemplateId={template.id} />
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {mode === "create" ? "Create Template" : "Update Template"}
        </Button>
      </div>
    </form>
  );
}
