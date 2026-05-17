// Extracted from `src/app/(admin)/admin/sessions/page.tsx` during the
// file-size sweep. Pure props-driven (no hidden closure deps on the
// parent). The parent passes mode + session + initialDate + rideAreas +
// submitting state, and gets onClose / onCreate / onUpdate callbacks.

"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useEffect, useState } from "react";

import type { RideArea, Session } from "@/app/(admin)/admin/sessions/types";
import { formatDateTimeLocal } from "@/app/(admin)/admin/sessions/utils";

export function SessionFormModal({
  mode,
  session,
  initialDate,
  rideAreas,
  submitting,
  onClose,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  session?: Session | null;
  initialDate?: Date | null;
  rideAreas: RideArea[];
  submitting: boolean;
  onClose: () => void;
  onCreate: (data: any, rideConfigs: any[], publishAfter?: boolean) => void;
  onUpdate: (id: string, data: any, rideConfigs: any[]) => void;
}) {
  const now = new Date();
  const defaultStart = initialDate || now;
  const defaultEnd = new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: session?.title || "",
    session_type: session?.session_type || "club",
    // Preferred: pool_id from the registry. Keep location (legacy enum) and
    // location_name to avoid regressions on pre-registry sessions.
    pool_id: session?.pool_id ?? null,
    location: session?.location || null,
    location_name: session?.location_name ?? null,
    starts_at: session
      ? formatDateTimeLocal(new Date(session.starts_at))
      : formatDateTimeLocal(defaultStart),
    ends_at: session
      ? formatDateTimeLocal(new Date(session.ends_at))
      : formatDateTimeLocal(defaultEnd),
    pool_fee: session?.pool_fee ?? 2000,
    capacity: session?.capacity ?? 20,
    description: session?.description || "",
    publish_status: "draft" as "draft" | "published",
    // Optional Pod link for Club sessions. NULL = "general Club session,
    // any Club member welcome". Set = "this Saturday's session for
    // Dolphins specifically". See docs/club/POD_OPERATIONS.md.
    pod_id: session?.pod_id ?? null,
  });

  // Lazy-load active pods only when session_type is "club" — avoids the
  // round-trip for academy/community/event sessions where pod_id doesn't
  // apply.
  const [pods, setPods] = useState<
    Array<{ id: string; label: string; club_id: string }>
  >([]);
  useEffect(() => {
    if (form.session_type !== "club") return;
    if (pods.length > 0) return;
    void (async () => {
      try {
        const { listPublicPods, podDisplayName } = await import("@/lib/pods");
        const list = await listPublicPods();
        setPods(
          list.map((p) => ({
            id: p.id,
            label: podDisplayName(p),
            club_id: p.club_id,
          })),
        );
      } catch (e) {
        console.warn("Failed to load pods for session form", e);
      }
    })();
  }, [form.session_type, pods.length]);

  const [rideConfigs, setRideConfigs] = useState<
    Array<{ ride_area_id: string; cost: number; capacity: number; departure_time: string }>
  >([]);
  const [showRide, setShowRide] = useState(false);

  const addRideConfig = () => {
    setShowRide(true);
    setRideConfigs((prev) => [
      ...prev,
      {
        ride_area_id: "",
        cost: 1000,
        capacity: 4,
        departure_time: formatDateTimeLocal(
          new Date(new Date(form.starts_at).getTime() - 2 * 60 * 60 * 1000)
        ),
      },
    ]);
  };

  const removeRideConfig = (i: number) => {
    setRideConfigs((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateRideConfig = (i: number, field: string, value: any) => {
    setRideConfigs((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionData = {
      title: form.title,
      session_type: form.session_type,
      // When a pool is picked, send pool_id as the authoritative link and
      // skip the legacy enum. Pre-registry sessions without a pool_id
      // continue to send the `location` enum for backwards compatibility.
      pool_id: form.pool_id ?? null,
      location: form.pool_id ? null : form.location,
      location_name: form.location_name ?? null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      pool_fee: form.pool_fee,
      capacity: form.capacity,
      description: form.description || undefined,
      // Pod link is only meaningful for Club sessions; clear it on type
      // switch so we don't ship a stale pod_id for an academy/event row.
      pod_id: form.session_type === "club" ? form.pod_id ?? null : null,
    };

    const validRides = rideConfigs
      .filter((c) => c.ride_area_id)
      .map((c) => ({
        ride_area_id: c.ride_area_id,
        cost: parseFloat(c.cost as any) || 0,
        capacity: parseInt(c.capacity as any) || 4,
        departure_time: c.departure_time ? new Date(c.departure_time).toISOString() : null,
      }));

    if (mode === "edit" && session) {
      onUpdate(session.id, sessionData, validRides);
    } else {
      onCreate(sessionData, validRides, form.publish_status === "published");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={mode === "create" ? "Create Session" : "Edit Session"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Session Type"
            value={form.session_type}
            onChange={(e) => setForm({ ...form, session_type: e.target.value as any })}
          >
            <option value="club">Club</option>
            <option value="cohort_class">Academy / Cohort Class</option>
            <option value="community">Community</option>
            <option value="event">Event</option>
          </Select>
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
            hint="Managed at Admin → Pool Registry."
          />
        </div>
        {/* Pod link — only meaningful for Club sessions. NULL = general
            Club session open to any club member. Set = scheduled for that
            specific pod's roster (Saturday for Dolphins, etc). */}
        {form.session_type === "club" && (
          <Select
            label="Pod (optional)"
            value={form.pod_id ?? ""}
            onChange={(e) =>
              setForm({ ...form, pod_id: e.target.value || null })
            }
            hint="Leave blank for a general Club session. Pick a pod to scope this to that crew's Saturday."
          >
            <option value="">— General Club session —</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start Time"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Pool Fee (₦)"
            type="number"
            value={form.pool_fee}
            onChange={(e) => setForm({ ...form, pool_fee: parseInt(e.target.value) || 0 })}
            required
          />
          <Input
            label="Capacity"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <Textarea
          label="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        {mode === "create" && (
          <Select
            label="Status"
            value={form.publish_status}
            onChange={(e) =>
              setForm({ ...form, publish_status: e.target.value as "draft" | "published" })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published (visible to members immediately)</option>
          </Select>
        )}

        {/* Ride Share section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Ride Share Options</span>
            <button
              type="button"
              onClick={addRideConfig}
              className="text-sm text-cyan-600 hover:text-cyan-800"
            >
              + Add Ride Area
            </button>
          </div>
          {rideConfigs.map((cfg, i) => (
            <div key={i} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Ride Area {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRideConfig(i)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Area"
                  value={cfg.ride_area_id}
                  onChange={(e) => updateRideConfig(i, "ride_area_id", e.target.value)}
                  required
                >
                  <option value="">-- Select --</option>
                  {rideAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.pickup_locations.length} stops)
                    </option>
                  ))}
                </Select>
                <Input
                  label="Cost (N)"
                  type="number"
                  value={cfg.cost}
                  onChange={(e) => updateRideConfig(i, "cost", parseFloat(e.target.value))}
                />
                <Input
                  label="Capacity (seats)"
                  type="number"
                  value={cfg.capacity}
                  onChange={(e) => updateRideConfig(i, "capacity", parseInt(e.target.value))}
                />
                <Input
                  label="Departure Time"
                  type="datetime-local"
                  value={cfg.departure_time}
                  onChange={(e) => updateRideConfig(i, "departure_time", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : mode === "create" ? "Create Session" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
