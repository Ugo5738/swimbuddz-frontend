// Extracted from `src/app/(admin)/admin/sessions/page.tsx` during the
// file-size sweep. Pure props-driven (no hidden closure deps on the
// parent). The parent passes mode + session + initialDate + rideAreas +
// submitting state, and gets onClose / onCreate / onUpdate callbacks.

"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import {
  VolunteerNeedsDraftSection,
  type VolunteerNeedDraft,
} from "@/components/admin/VolunteerNeedsDraftSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/api";
import { PoolPricingApi } from "@/lib/poolPricing";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  RideArea,
  Session,
  SessionCostLine,
  SessionPayload,
  SessionRideConfig,
  SessionType,
} from "@/app/(admin)/admin/sessions/types";
import { formatDateTimeLocal } from "@/app/(admin)/admin/sessions/utils";

// In-form shape of a ride-config row before submit. `departure_time` is a
// local-datetime string (input[type=datetime-local]); it gets serialized
// to ISO in handleSubmit.
type RideConfigDraft = {
  ride_area_id: string;
  cost: number;
  capacity: number;
  departure_time: string;
};

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
  onCreate: (
    data: SessionPayload,
    rideConfigs: SessionRideConfig[],
    volunteerNeeds: VolunteerNeedDraft[],
    publishAfter?: boolean
  ) => void;
  onUpdate: (
    id: string,
    data: SessionPayload,
    rideConfigs: SessionRideConfig[],
    volunteerNeeds: VolunteerNeedDraft[]
  ) => void;
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
    guest_fee: session?.guest_fee ?? 0,
    community_dropin_fee: session?.community_dropin_fee ?? 0,
    guest_referral_reward: session?.guest_referral_reward ?? 1000,
    capacity: session?.capacity ?? 20,
    pricing_mode: session?.pricing_mode ?? ("manual" as "manual" | "cost_plus"),
    pricing_expected_attendees: session?.pricing_expected_attendees ?? session?.capacity ?? 20,
    cost_lines: session?.cost_lines ?? ([] as SessionCostLine[]),
    margin_type:
      session?.margin_type ?? ("fixed_per_attendee" as "fixed_per_attendee" | "percentage"),
    margin_value: session?.margin_value ?? 0,
    description: session?.description || "",
    publish_status: "draft" as "draft" | "published",
    // Optional Pod link for Club sessions. NULL = "general Club session,
    // any Club member welcome". Set = "this Saturday's session for
    // Dolphins specifically". See docs/club/POD_OPERATIONS.md.
    pod_id: session?.pod_id ?? null,
    // Context FKs the session_type discriminator requires (A1):
    //   cohort_class → cohort_id required;  event → event_id required;
    //   club → pod_id optional;  community → none.
    cohort_id: session?.cohort_id ?? null,
    event_id: session?.event_id ?? null,
  });
  const [clubScope, setClubScope] = useState<"general" | "pod">(
    session?.pod_id ? "pod" : "general"
  );
  const [volunteerNeeds, setVolunteerNeeds] = useState<VolunteerNeedDraft[]>([]);

  // Lazy-load active pods only when session_type is "club" — avoids the
  // round-trip for academy/community/event sessions where pod_id doesn't
  // apply.
  const [pods, setPods] = useState<Array<{ id: string; label: string; club_id: string }>>([]);
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
          }))
        );
      } catch (e) {
        console.warn("Failed to load pods for session form", e);
      }
    })();
  }, [form.session_type, pods.length]);

  // Lazy-load cohorts only when the type is "cohort_class" — required by
  // the discriminator. Mirrors the pods pattern.
  const [cohorts, setCohorts] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    if (form.session_type !== "cohort_class") return;
    if (cohorts.length > 0) return;
    void (async () => {
      try {
        const { AcademyApi, CohortStatus } = await import("@/lib/academy");
        const list = await AcademyApi.listCohorts();
        setCohorts(
          list
            .filter(
              (c) => c.status !== CohortStatus.COMPLETED && c.status !== CohortStatus.CANCELLED
            )
            .map((c) => ({ id: c.id, label: c.name }))
        );
      } catch (e) {
        console.warn("Failed to load cohorts for session form", e);
      }
    })();
  }, [form.session_type, cohorts.length]);

  // Lazy-load events only when the type is "event" — required by the
  // discriminator.
  const [events, setEvents] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    if (form.session_type !== "event") return;
    if (events.length > 0) return;
    void (async () => {
      try {
        const list = await apiGet<Array<{ id: string; title: string }>>("/api/v1/events/", {
          auth: true,
        });
        setEvents(list.map((ev) => ({ id: ev.id, label: ev.title })));
      } catch (e) {
        console.warn("Failed to load events for session form", e);
      }
    })();
  }, [form.session_type, events.length]);

  const [rideConfigs, setRideConfigs] = useState<RideConfigDraft[]>([]);
  const [showRide, setShowRide] = useState(false);
  const [quoteStaff, setQuoteStaff] = useState(1);
  const [quoteLanes, setQuoteLanes] = useState(1);
  const [quoting, setQuoting] = useState(false);

  const estimatedTotalCost = form.cost_lines.reduce(
    (total, line) => total + line.unit_cost_naira * line.quantity,
    0
  );
  const estimatedCostPerAttendee =
    estimatedTotalCost / Math.max(form.pricing_expected_attendees, 1);
  const marginPerAttendee =
    form.margin_type === "percentage"
      ? estimatedCostPerAttendee * (form.margin_value / 100)
      : form.margin_value;
  const costPlusBookingPrice = estimatedCostPerAttendee + marginPerAttendee;

  const activityScope =
    form.session_type === "club"
      ? "club"
      : form.session_type === "cohort_class"
        ? "academy"
        : "community";

  const loadCostQuote = async () => {
    if (!form.pool_id) {
      toast.error("Select a pool before loading its cost rates");
      return;
    }
    setQuoting(true);
    try {
      const quote = await PoolPricingApi.quote({
        pool_id: form.pool_id,
        activity_scope: activityScope,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        timezone: session?.timezone ?? "Africa/Lagos",
        expected_attendees: Math.max(form.pricing_expected_attendees, 1),
        expected_staff: Math.max(quoteStaff, 0),
        lanes: Math.max(quoteLanes, 1),
      });
      setForm((current) => ({
        ...current,
        pricing_mode: "cost_plus",
        cost_lines: quote.lines,
      }));
      if (quote.warnings.length) {
        toast.warning(quote.warnings.join(" "));
      } else {
        toast.success("Current cost rates loaded");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cost quote failed");
    } finally {
      setQuoting(false);
    }
  };

  const updateCostLine = <K extends keyof SessionCostLine>(
    index: number,
    field: K,
    value: SessionCostLine[K]
  ) => {
    setForm((current) => ({
      ...current,
      cost_lines: current.cost_lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
              source_rate_id:
                field === "unit_cost_naira" || field === "quantity" ? null : line.source_rate_id,
            }
          : line
      ),
    }));
  };

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

  const updateRideConfig = <K extends keyof RideConfigDraft>(
    i: number,
    field: K,
    value: RideConfigDraft[K]
  ) => {
    setRideConfigs((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Discriminator guard (A1): give the admin instant feedback instead
    // of a backend 422 when the required context FK is missing.
    if (form.session_type === "cohort_class" && !form.cohort_id) {
      alert("Pick the cohort this Academy class belongs to.");
      return;
    }
    if (form.session_type === "event" && !form.event_id) {
      alert("Pick the event this session belongs to.");
      return;
    }
    if (form.session_type === "club" && clubScope === "pod" && !form.pod_id) {
      alert("Pick the pod this Club session is for.");
      return;
    }

    const sessionData: SessionPayload = {
      title: form.title,
      session_type: form.session_type,
      // Send ONLY the context FK that matches the session_type so we
      // never ship a discriminator-violating combination.
      cohort_id: form.session_type === "cohort_class" ? form.cohort_id : null,
      event_id: form.session_type === "event" ? form.event_id : null,
      // When a pool is picked, send pool_id as the authoritative link and
      // skip the legacy enum. Pre-registry sessions without a pool_id
      // continue to send the `location` enum for backwards compatibility.
      pool_id: form.pool_id ?? null,
      location: form.pool_id ? null : form.location,
      location_name: form.location_name ?? null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      pool_fee: form.pool_fee,
      guest_fee: form.guest_fee || null,
      community_dropin_fee: form.community_dropin_fee || null,
      guest_referral_reward: form.guest_referral_reward,
      capacity: form.capacity,
      pricing_mode: form.pricing_mode,
      pricing_expected_attendees: form.pricing_expected_attendees,
      cost_lines: form.cost_lines,
      margin_type: form.margin_type,
      margin_value: form.margin_value,
      description: form.description || undefined,
      // Pod link is only meaningful for Club sessions; clear it on type
      // switch so we don't ship a stale pod_id for an academy/event row.
      pod_id: form.session_type === "club" && clubScope === "pod" ? (form.pod_id ?? null) : null,
    };

    const validRides: SessionRideConfig[] = rideConfigs
      .filter((c) => c.ride_area_id)
      .map((c) => ({
        ride_area_id: c.ride_area_id,
        // cost/capacity already arrive as `number` from controlled inputs
        // (we type them in state). Number(...) guards a stray non-numeric.
        cost: Number(c.cost) || 0,
        capacity: Number(c.capacity) || 4,
        departure_time: c.departure_time ? new Date(c.departure_time).toISOString() : null,
      }));

    if (mode === "edit" && session) {
      onUpdate(session.id, sessionData, validRides, volunteerNeeds);
    } else {
      onCreate(sessionData, validRides, volunteerNeeds, form.publish_status === "published");
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
            onChange={(e) => setForm({ ...form, session_type: e.target.value as SessionType })}
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
        {/* Cohort link — REQUIRED for Academy / Cohort Class sessions
            (discriminator rule). Without it the backend rejects the
            session. Only active/upcoming cohorts are listed. */}
        {form.session_type === "cohort_class" && (
          <Select
            label="Cohort"
            value={form.cohort_id ?? ""}
            onChange={(e) => setForm({ ...form, cohort_id: e.target.value || null })}
            required
            hint="Which academy cohort is this class for?"
          >
            <option value="">— Select a cohort —</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
        {/* Event link — REQUIRED for Event sessions (discriminator rule). */}
        {form.session_type === "event" && (
          <Select
            label="Event"
            value={form.event_id ?? ""}
            onChange={(e) => setForm({ ...form, event_id: e.target.value || null })}
            required
            hint="Which community event is this session part of?"
          >
            <option value="">— Select an event —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.label}
              </option>
            ))}
          </Select>
        )}
        {/* Pod link — only meaningful for Club sessions. NULL = general
            Club session open to any club member. Set = scheduled for that
            specific pod's roster (Saturday for Dolphins, etc). */}
        {form.session_type === "club" && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">Club scope</legend>
            <div
              className="grid grid-cols-2 rounded-md border border-slate-200 p-1"
              role="radiogroup"
              aria-label="Club session scope"
            >
              <button
                type="button"
                role="radio"
                aria-checked={clubScope === "general"}
                onClick={() => {
                  setClubScope("general");
                  setForm({ ...form, pod_id: null });
                }}
                className={`min-h-10 rounded px-3 py-2 text-sm font-medium transition ${
                  clubScope === "general"
                    ? "bg-cyan-700 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                General Club
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={clubScope === "pod"}
                onClick={() => setClubScope("pod")}
                className={`min-h-10 rounded px-3 py-2 text-sm font-medium transition ${
                  clubScope === "pod"
                    ? "bg-cyan-700 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Pod-specific
              </button>
            </div>
            {clubScope === "pod" && (
              <Select
                label="Pod"
                value={form.pod_id ?? ""}
                onChange={(e) => setForm({ ...form, pod_id: e.target.value || null })}
                required
              >
                <option value="">Select a pod</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            )}
          </fieldset>
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
            label="Booking price per attendee (₦)"
            type="number"
            min={0}
            step="0.01"
            value={
              form.pricing_mode === "cost_plus"
                ? Number(costPlusBookingPrice.toFixed(2))
                : form.pool_fee
            }
            onChange={(e) => setForm({ ...form, pool_fee: parseInt(e.target.value) || 0 })}
            disabled={form.pricing_mode === "cost_plus"}
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
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
          <Input
            label="Guest rate (₦)"
            type="number"
            min={0}
            value={form.guest_fee}
            onChange={(e) => setForm({ ...form, guest_fee: parseInt(e.target.value) || 0 })}
            hint="Independent trial/guest rate. Zero uses the normal booking price."
          />
          <Input
            label="Community drop-in (₦)"
            type="number"
            min={0}
            value={form.community_dropin_fee}
            onChange={(e) =>
              setForm({ ...form, community_dropin_fee: parseInt(e.target.value) || 0 })
            }
            hint="Independent from the guest rate, even when both currently match."
          />
          <Input
            label="Referral thank-you (₦)"
            type="number"
            min={0}
            value={form.guest_referral_reward}
            onChange={(e) =>
              setForm({ ...form, guest_referral_reward: parseInt(e.target.value) || 0 })
            }
            hint="One-time reward after a referred guest's first paid attendance."
          />
        </div>
        <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div>
            <legend className="text-sm font-semibold text-slate-900">
              How should the booking price be set?
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Use a manual price for the usual quick setup. Use cost plus margin when you want the
              system to calculate a sustainable price from pool, staffing, lane, and other costs.
            </p>
          </div>
          <Select
            label="Pricing method"
            value={form.pricing_mode}
            onChange={(e) =>
              setForm({
                ...form,
                pricing_mode: e.target.value as "manual" | "cost_plus",
              })
            }
          >
            <option value="manual">Set one booking price manually</option>
            <option value="cost_plus">Calculate from costs + margin</option>
          </Select>

          {form.pricing_mode === "manual" ? (
            <div className="rounded-lg border border-cyan-100 bg-white p-3 text-sm text-slate-600">
              Enter the amount each member pays in <strong>Booking price per attendee </strong>
              above. Capacity controls how many places can be booked; no cost breakdown is needed.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-cyan-100 bg-white p-3 text-xs leading-5 text-slate-600">
                <strong>1.</strong> Enter expected attendance, staff, and lanes. <strong>2.</strong>{" "}
                Load the pool rates or add costs yourself. <strong>3.</strong> Choose the margin.
                The calculated booking price is shown above and in the summary below.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Expected attendees"
                  type="number"
                  min={1}
                  value={form.pricing_expected_attendees}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pricing_expected_attendees: Math.max(parseInt(e.target.value) || 1, 1),
                    })
                  }
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void loadCostQuote()}
                    disabled={quoting || !form.pool_id}
                    className="w-full"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {quoting ? "Loading..." : `Load ${activityScope} rates`}
                  </Button>
                </div>
                <Input
                  label="Expected staff"
                  type="number"
                  min={0}
                  value={quoteStaff}
                  onChange={(e) => setQuoteStaff(Math.max(parseInt(e.target.value) || 0, 0))}
                />
                <Input
                  label="Lanes"
                  type="number"
                  min={1}
                  value={quoteLanes}
                  onChange={(e) => setQuoteLanes(Math.max(parseInt(e.target.value) || 1, 1))}
                />
              </div>

              <div className="space-y-3">
                {form.cost_lines.map((line, index) => (
                  <div
                    key={`${line.category}-${index}`}
                    className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-[1fr_1fr_7rem_7rem_2.5rem]"
                  >
                    <Input
                      label={index === 0 ? "Cost" : undefined}
                      value={line.description}
                      onChange={(e) => updateCostLine(index, "description", e.target.value)}
                    />
                    <Select
                      label={index === 0 ? "Basis" : undefined}
                      value={line.charge_basis}
                      onChange={(e) =>
                        updateCostLine(
                          index,
                          "charge_basis",
                          e.target.value as SessionCostLine["charge_basis"]
                        )
                      }
                    >
                      <option value="per_attendee">Per attendee</option>
                      <option value="per_staff">Per staff</option>
                      <option value="per_hour">Per hour</option>
                      <option value="per_lane">Per lane</option>
                      <option value="flat_session">Flat session</option>
                    </Select>
                    <Input
                      label={index === 0 ? "Unit (₦)" : undefined}
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_cost_naira}
                      onChange={(e) =>
                        updateCostLine(index, "unit_cost_naira", Number(e.target.value) || 0)
                      }
                    />
                    <Input
                      label={index === 0 ? "Qty" : undefined}
                      type="number"
                      min={0}
                      step="0.25"
                      value={line.quantity}
                      onChange={(e) =>
                        updateCostLine(index, "quantity", Number(e.target.value) || 0)
                      }
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            cost_lines: form.cost_lines.filter(
                              (_, lineIndex) => lineIndex !== index
                            ),
                          })
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                        title="Remove cost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm({
                      ...form,
                      cost_lines: [
                        ...form.cost_lines,
                        {
                          category: "other",
                          description: "Other cost",
                          charge_basis: "flat_session",
                          unit_cost_naira: 0,
                          quantity: 1,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add cost
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Margin method"
                  value={form.margin_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      margin_type: e.target.value as "fixed_per_attendee" | "percentage",
                    })
                  }
                >
                  <option value="fixed_per_attendee">Fixed per attendee</option>
                  <option value="percentage">Percentage of cost</option>
                </Select>
                <Input
                  label={
                    form.margin_type === "percentage" ? "Margin (%)" : "Margin per attendee (₦)"
                  }
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.margin_value}
                  onChange={(e) => setForm({ ...form, margin_value: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 text-sm sm:grid-cols-4">
                <Metric label="Total cost" value={estimatedTotalCost} />
                <Metric label="Cost / attendee" value={estimatedCostPerAttendee} />
                <Metric label="Margin / attendee" value={marginPerAttendee} />
                <Metric label="Booking price" value={costPlusBookingPrice} />
              </div>
            </>
          )}
        </fieldset>
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

        <VolunteerNeedsDraftSection
          needs={volunteerNeeds}
          onChange={setVolunteerNeeds}
          description={
            mode === "create"
              ? "Choose any volunteer roles needed for this session. They will be attached and opened to eligible members as soon as the session is saved."
              : "Add more roles to this session. Existing opportunities remain unchanged and can be managed from Community → Volunteers."
          }
        />

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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">
        ₦
        {Number.isFinite(value)
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : "0"}
      </p>
    </div>
  );
}
