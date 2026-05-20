"use client";

/**
 * Volunteer-needs editor surfaced inside the Session Template edit panel.
 *
 * Each row is a recurring volunteer need: when sessions are generated
 * from the parent template, sessions_service calls volunteer_service's
 * `/internal/volunteer/opportunities/from-session-template` endpoint,
 * which fans out one VolunteerOpportunity per active row here.
 *
 * Renders nothing in "create" mode — slots are scoped to an existing
 * template id, so the admin must save the template first.
 *
 * See docs/design/VOLUNTEER_OPPORTUNITY_CONTEXT_DESIGN.md §C1.
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  TIER_LABELS,
  VolunteersApi,
  type SessionTemplateVolunteerSlot,
  type VolunteerRole,
} from "@/lib/volunteers";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface DraftSlot {
  role_id: string;
  slots_needed: number;
  opportunity_type: "open_claim" | "approval_required";
  min_tier: "tier_1" | "tier_2" | "tier_3";
  title_override: string;
}

const EMPTY_DRAFT: DraftSlot = {
  role_id: "",
  slots_needed: 1,
  opportunity_type: "open_claim",
  min_tier: "tier_1",
  title_override: "",
};

export function SessionTemplateVolunteerSlotsSection({
  sessionTemplateId,
}: {
  sessionTemplateId: string;
}) {
  const [slots, setSlots] = useState<SessionTemplateVolunteerSlot[]>([]);
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftSlot>(EMPTY_DRAFT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [existing, allRoles] = await Promise.all([
          VolunteersApi.admin.listSessionTemplateSlots(sessionTemplateId),
          VolunteersApi.listRoles(false),
        ]);
        if (cancelled) return;
        setSlots(existing);
        setRoles(allRoles);
      } catch (e) {
        console.error("Failed to load volunteer slots", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionTemplateId]);

  const handleAdd = async () => {
    if (!draft.role_id) {
      toast.error("Pick a role first.");
      return;
    }
    setSaving(true);
    try {
      const created = await VolunteersApi.admin.createSessionTemplateSlot(sessionTemplateId, {
        session_template_id: sessionTemplateId,
        role_id: draft.role_id,
        slots_needed: draft.slots_needed,
        opportunity_type: draft.opportunity_type,
        min_tier: draft.min_tier,
        qr_checkin_enabled: false,
        title_override: draft.title_override || null,
        description_override: null,
        cancellation_deadline_hours: 24,
        is_active: true,
      });
      setSlots([...slots, created]);
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      toast.error("Could not add volunteer need.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (slotId: string) => {
    setSaving(true);
    try {
      await VolunteersApi.admin.deleteSessionTemplateSlot(sessionTemplateId, slotId);
      setSlots(slots.filter((s) => s.id !== slotId));
    } catch (e) {
      toast.error("Could not remove volunteer need.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (slot: SessionTemplateVolunteerSlot, is_active: boolean) => {
    setSaving(true);
    try {
      const updated = await VolunteersApi.admin.updateSessionTemplateSlot(
        sessionTemplateId,
        slot.id,
        { is_active }
      );
      setSlots(slots.map((s) => (s.id === slot.id ? updated : s)));
    } catch (e) {
      toast.error("Could not update volunteer need.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        Loading volunteer needs…
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800">Volunteer needs</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Every session generated from this template will automatically open these volunteer slots.
        </p>
      </div>

      {/* Existing slots */}
      {slots.length > 0 && (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {slot.title_override || slot.role_title || "Volunteer"}
                </p>
                <p className="text-xs text-slate-500">
                  {slot.slots_needed} slot{slot.slots_needed === 1 ? "" : "s"} ·{" "}
                  {TIER_LABELS[slot.min_tier]} ·{" "}
                  {slot.opportunity_type === "open_claim" ? "Open" : "Approval"}
                  {!slot.is_active ? " · Inactive" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(slot, !slot.is_active)}
                  disabled={saving}
                  className="text-xs"
                >
                  {slot.is_active ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(slot.id)}
                  disabled={saving}
                  className="text-xs text-rose-600"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add draft row */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          label="Role"
          value={draft.role_id}
          onChange={(e) => setDraft({ ...draft, role_id: e.target.value })}
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
          label="Slots"
          type="number"
          min={1}
          value={draft.slots_needed}
          onChange={(e) =>
            setDraft({
              ...draft,
              slots_needed: Math.max(1, parseInt(e.target.value) || 1),
            })
          }
        />
        <Select
          label="Claim type"
          value={draft.opportunity_type}
          onChange={(e) =>
            setDraft({
              ...draft,
              opportunity_type: e.target.value as "open_claim" | "approval_required",
            })
          }
        >
          <option value="open_claim">Open</option>
          <option value="approval_required">Approval required</option>
        </Select>
        <Select
          label="Min tier"
          value={draft.min_tier}
          onChange={(e) =>
            setDraft({
              ...draft,
              min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
            })
          }
        >
          <option value="tier_1">Tier 1</option>
          <option value="tier_2">Tier 2</option>
          <option value="tier_3">Tier 3</option>
        </Select>
      </div>
      <Input
        label="Title override (optional)"
        value={draft.title_override}
        onChange={(e) => setDraft({ ...draft, title_override: e.target.value })}
        placeholder="Defaults to the role's title"
      />
      <Button
        type="button"
        variant="secondary"
        onClick={handleAdd}
        disabled={saving || !draft.role_id}
        className="w-full"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add volunteer need
      </Button>
    </div>
  );
}
