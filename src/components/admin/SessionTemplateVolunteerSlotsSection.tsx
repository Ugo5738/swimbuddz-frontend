"use client";

/**
 * Persisted volunteer-needs editor for an existing session template.
 * Each saved row materialises into a real, session-linked opportunity for
 * every generated session.
 */

import {
  VolunteerNeedsDraftSection,
  type VolunteerNeedDraft,
} from "@/components/admin/VolunteerNeedsDraftSection";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { TIER_LABELS, VolunteersApi, type SessionTemplateVolunteerSlot } from "@/lib/volunteers";
import { Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

async function syncFutureSessions(sessionTemplateId: string) {
  return apiPost<{ sessions_checked: number; created_count: number; warnings: string[] }>(
    `/api/v1/sessions/templates/${sessionTemplateId}/sync-volunteer-opportunities`,
    undefined,
    { auth: true }
  );
}

function shortTime(value: string | null | undefined): string {
  return value?.slice(0, 5) ?? "";
}

export function SessionTemplateVolunteerSlotsSection({
  sessionTemplateId,
  defaultStartTime,
  defaultEndTime,
}: {
  sessionTemplateId: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}) {
  const {
    data: slotsData,
    error,
    loading,
    refetch,
  } = useApi<SessionTemplateVolunteerSlot[]>(
    `/api/v1/admin/volunteers/session-templates/${sessionTemplateId}/slots`
  );
  const [saving, setSaving] = useState(false);
  const slots = slotsData ?? [];

  const handleAdd = async (need: VolunteerNeedDraft) => {
    if (saving) return;
    setSaving(true);
    try {
      await VolunteersApi.admin.createSessionTemplateSlot(sessionTemplateId, {
        session_template_id: sessionTemplateId,
        role_id: need.role_id,
        slots_needed: need.slots_needed,
        opportunity_type: need.opportunity_type,
        min_tier: need.min_tier,
        qr_checkin_enabled: need.qr_checkin_enabled,
        title_override: need.title_override || null,
        description_override: need.description || null,
        start_time_override: need.start_time || null,
        end_time_override: need.end_time || null,
        cancellation_deadline_hours: need.cancellation_deadline_hours,
        is_active: true,
      });
      refetch();
      try {
        const synced = await syncFutureSessions(sessionTemplateId);
        if (synced.created_count > 0) {
          toast.success(
            `Volunteer opportunity opened on ${synced.created_count} existing session${
              synced.created_count === 1 ? "" : "s"
            }.`
          );
        } else {
          toast.success("Volunteer need added for future generated sessions.");
        }
      } catch (syncError) {
        console.warn("Volunteer need saved, but existing-session sync failed", syncError);
        toast.warning("Volunteer need saved, but existing sessions could not be updated.");
      }
    } catch (createError) {
      toast.error("Could not add volunteer need.");
      console.error(createError);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (slotId: string) => {
    setSaving(true);
    try {
      await VolunteersApi.admin.deleteSessionTemplateSlot(sessionTemplateId, slotId);
      refetch();
    } catch (removeError) {
      toast.error("Could not remove volunteer need.");
      console.error(removeError);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (slot: SessionTemplateVolunteerSlot, isActive: boolean) => {
    setSaving(true);
    try {
      await VolunteersApi.admin.updateSessionTemplateSlot(sessionTemplateId, slot.id, {
        is_active: isActive,
      });
      refetch();
      if (isActive) {
        await syncFutureSessions(sessionTemplateId).catch((syncError) => {
          console.warn("Existing-session volunteer sync failed", syncError);
        });
      }
    } catch (updateError) {
      toast.error("Could not update volunteer need.");
      console.error(updateError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800">Saved volunteer needs</h4>
        <p className="mt-0.5 text-xs text-slate-500">
          Every session generated from this template opens real opportunities linked to that
          session. Existing future sessions are synced when you add a need.
        </p>
      </div>

      {loading && <p className="text-xs text-slate-500">Loading volunteer needs…</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {!loading && slots.length > 0 && (
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-white p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">
                  {slot.title_override || slot.role_title || "Volunteer"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {slot.slots_needed} slot{slot.slots_needed === 1 ? "" : "s"} ·{" "}
                  {TIER_LABELS[slot.min_tier]} ·{" "}
                  {slot.opportunity_type === "open_claim" ? "Open" : "Approval"}
                  {!slot.is_active ? " · Inactive" : ""}
                </p>
                {(slot.start_time_override || slot.end_time_override) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {shortTime(slot.start_time_override) || shortTime(defaultStartTime)}–
                    {shortTime(slot.end_time_override) || shortTime(defaultEndTime)}
                  </p>
                )}
                {slot.description_override && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {slot.description_override}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
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
                  aria-label={`Remove ${slot.title_override || slot.role_title || "volunteer need"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <VolunteerNeedsDraftSection
        needs={[]}
        onChange={(drafts) => {
          if (drafts[0]) void handleAdd(drafts[0]);
        }}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        description="Create a fresh recurring need or copy a saved volunteer template. Times default to the session template and can be adjusted for setup, check-in, or other shorter shifts."
      />
    </section>
  );
}
