// Extracted from `src/app/(admin)/admin/sessions/page.tsx` during the
// file-size sweep. Pure props-driven (no hidden closure deps on the
// parent). The parent passes mode + session + initialDate + rideAreas +
// submitting state, and gets onClose / onCreate / onUpdate callbacks.

"use client";

import { ClubAccessModeHint } from "@/components/admin/ClubAccessModeHint";
import { ClubSessionScopeFields } from "@/components/admin/ClubSessionScopeFields";
import { PoolPicker } from "@/components/admin/PoolPicker";
import { SessionVolunteerOpportunitiesSection } from "@/components/admin/SessionVolunteerOpportunitiesSection";
import { useClubSessionScope } from "@/components/admin/useClubSessionScope";
import {
  VolunteerNeedsDraftSection,
  type VolunteerNeedDraft,
} from "@/components/admin/VolunteerNeedsDraftSection";
import { RescheduleClubPractice } from "@/components/club/RescheduleClubPractice";
import {
  GuestSessionSettingsFields,
  type GuestSettingsDraft,
} from "@/components/guest-passes/GuestSessionSettingsFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/api";
import { PoolPricingApi } from "@/lib/poolPricing";
import { withExpectedAttendance, withSessionCapacity } from "@/lib/sessionPricingForm";
import { Calculator, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
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

type SessionFormProps = {
  mode: "create" | "edit";
  session?: Session | null;
  initialDate?: Date | null;
  initialEvent?: {
    id: string;
    title: string;
    endsAt?: Date | null;
    poolId?: string | null;
    locationName?: string | null;
  } | null;
  initialRideConfigs?: SessionRideConfig[];
  presentation?: "modal" | "page";
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
};

export function SessionFormModal({
  mode,
  session,
  initialDate,
  initialEvent,
  initialRideConfigs = [],
  presentation = "modal",
  rideAreas,
  submitting,
  onClose,
  onCreate,
  onUpdate,
}: SessionFormProps) {
  const now = new Date();
  const defaultStart = initialDate || now;
  const defaultEnd = initialEvent?.endsAt ?? new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000);
  const publishedClub =
    mode === "edit" && !!session?.published_at && session.session_type === "club";
  const linkedEventSession = mode === "edit" && session?.session_type === "event";

  const [form, setForm] = useState({
    club_access_mode: session?.club_access_mode ?? "plan_included",
    title: session?.title || initialEvent?.title || "",
    session_type: session?.session_type || (initialEvent ? "event" : "club"),
    // Preferred: pool_id from the registry. Keep location (legacy enum) and
    // location_name to avoid regressions on pre-registry sessions.
    pool_id: session?.pool_id ?? initialEvent?.poolId ?? null,
    location: session?.location || null,
    location_name: session?.location_name ?? initialEvent?.locationName ?? null,
    starts_at: session
      ? formatDateTimeLocal(new Date(session.starts_at))
      : formatDateTimeLocal(defaultStart),
    ends_at: session
      ? formatDateTimeLocal(new Date(session.ends_at))
      : formatDateTimeLocal(defaultEnd),
    pool_fee: session?.pool_fee ?? 2000,
    cohort_fee_mode: session?.cohort_fee_mode ?? "included",
    guest_fee: session?.guest_fee == null ? "" : String(session.guest_fee),
    community_dropin_fee: session?.community_dropin_fee ?? 0,
    allows_community_dropins: session?.allows_community_dropins ?? false,
    capacity: session?.capacity ?? 20,
    pricing_mode: session?.pricing_mode ?? ("manual" as "manual" | "cost_plus"),
    pricing_expected_attendees: session?.pricing_expected_attendees ?? session?.capacity ?? 20,
    cost_lines: session?.cost_lines ?? ([] as SessionCostLine[]),
    margin_type:
      session?.margin_type ?? ("fixed_per_attendee" as "fixed_per_attendee" | "percentage"),
    margin_value: session?.margin_value ?? 0,
    description: session?.description || "",
    publish_status: "draft" as "draft" | "published",
    // Every Club session has a stable Club owner; Pod is an optional narrower
    // audience within that Club.
    club_id: session?.club_id ?? null,
    pod_id: session?.pod_id ?? null,
    // Context FKs the session_type discriminator requires (A1):
    //   cohort_class → cohort_id required;  event → event_id required;
    //   club → club_id required, pod_id optional;  community → none.
    cohort_id: session?.cohort_id ?? null,
    event_id: session?.event_id ?? initialEvent?.id ?? null,
  });
  const [guestSettings, setGuestSettings] = useState<GuestSettingsDraft>({
    allows_guests: session?.allows_guests ?? true,
    guest_booking_mode: session?.guest_booking_mode ?? "disabled",
    guest_booking_closes_at: session?.guest_booking_closes_at
      ? formatDateTimeLocal(new Date(session.guest_booking_closes_at))
      : "",
    guest_reconciliation_days: session?.guest_reconciliation_days ?? 3,
    guest_location_private: session?.guest_location_private ?? false,
  });
  const [volunteerNeeds, setVolunteerNeeds] = useState<VolunteerNeedDraft[]>([]);
  const {
    scope: clubScope,
    selectedPod,
    podDefaultPoolName,
    applyDefaultPool,
    handleClubChange,
    handlePodChange,
    handleScopeChange,
    resetScope,
  } = useClubSessionScope({
    sessionType: form.session_type,
    podId: form.pod_id,
    setForm,
  });

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

  const [rideConfigs, setRideConfigs] = useState<RideConfigDraft[]>(
    initialRideConfigs.map((config) => ({
      ...config,
      departure_time: config.departure_time
        ? formatDateTimeLocal(new Date(config.departure_time))
        : "",
    }))
  );
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
    if (form.pricing_expected_attendees > form.capacity) {
      toast.error(
        "Expected attendees cannot exceed capacity. Correct the attendance estimate first."
      );
      return;
    }
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
    if (form.pricing_mode === "cost_plus" && form.pricing_expected_attendees > form.capacity) {
      toast.error(
        "Expected attendees cannot exceed capacity. Correct the attendance estimate before saving."
      );
      return;
    }

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
    if (form.session_type === "club" && !form.club_id) {
      alert("Pick the Club and location this session belongs to.");
      return;
    }
    if (form.session_type === "club" && clubScope === "pod" && !form.pod_id) {
      alert("Pick the pod this Club session is for.");
      return;
    }

    if (guestSettings.guest_booking_mode !== "disabled" && form.guest_fee === "") {
      toast.error("Enter a guest rate, including 0 for a free guest swim.");
      return;
    }
    const sessionData: SessionPayload = {
      ...guestSettings,
      guest_booking_closes_at: guestSettings.guest_booking_closes_at
        ? new Date(guestSettings.guest_booking_closes_at).toISOString()
        : null,
      club_access_mode: form.session_type === "club" ? form.club_access_mode : "plan_included",
      title: form.title,
      session_type: form.session_type,
      cohort_fee_mode: form.session_type === "cohort_class" ? form.cohort_fee_mode : "included",
      // Send ONLY the context FK that matches the session_type so we
      // never ship a discriminator-violating combination.
      cohort_id: form.session_type === "cohort_class" ? form.cohort_id : null,
      event_id: form.session_type === "event" ? form.event_id : null,
      club_id: form.session_type === "club" ? form.club_id : null,
      // When a pool is picked, send pool_id as the authoritative link and
      // skip the legacy enum. Pre-registry sessions without a pool_id
      // continue to send the `location` enum for backwards compatibility.
      pool_id: form.pool_id ?? null,
      location: form.pool_id ? null : form.location,
      location_name: form.location_name ?? null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      pool_fee: form.pool_fee,
      guest_fee: form.guest_fee === "" ? null : Number(form.guest_fee),
      community_dropin_fee:
        form.session_type === "club" && form.allows_community_dropins
          ? form.community_dropin_fee
          : null,
      allows_community_dropins: form.session_type === "club" && form.allows_community_dropins,
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

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {linkedEventSession ? (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
          <p className="font-semibold">Shared Event details are synchronized</p>
          <p className="mt-1 leading-6">
            Change the title, description, date, venue, or capacity on the linked Event. This page
            remains the source of truth for member and guest prices, bookings, attendance, volunteer
            roles, and ride-share.
          </p>
          <Link
            href="/admin/community/events"
            className="mt-2 inline-flex font-semibold text-cyan-800 underline"
          >
            Manage the linked Event
          </Link>
        </div>
      ) : null}
      <Input
        label="Title"
        disabled={linkedEventSession}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
      />
      <Select
        label="Session Type"
        disabled={publishedClub || linkedEventSession}
        value={form.session_type}
        onChange={(event) => {
          const sessionType = event.target.value as SessionType;
          if (sessionType !== "club") {
            resetScope();
          }
          setForm({
            ...form,
            session_type: sessionType,
            cohort_fee_mode: "included",
            club_id: sessionType === "club" ? form.club_id : null,
            pod_id: sessionType === "club" ? form.pod_id : null,
          });
        }}
      >
        <option value="club">Club</option>
        <option value="cohort_class">Academy / Cohort Class</option>
        <option value="community">Community</option>
        <option value="event">Event</option>
      </Select>
      {/* Cohort link — REQUIRED for Academy / Cohort Class sessions
            (discriminator rule). Without it the backend rejects the
            session. Only active/upcoming cohorts are listed. */}
      {form.session_type === "cohort_class" && (
        <>
          <Select
            label="Cohort"
            value={form.cohort_id ?? ""}
            onChange={(e) => setForm({ ...form, cohort_id: e.target.value || null })}
            required
            hint="Which cohort are these regular or extra classes for? Enrollment in this cohort is still required."
          >
            <option value="">— Select a cohort —</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            label="Class payment"
            value={form.cohort_fee_mode}
            onChange={(e) =>
              setForm({ ...form, cohort_fee_mode: e.target.value as "included" | "paid_extra" })
            }
            hint="Regular classes are already paid through tuition. Choose a paid extra only for a separately agreed additional class."
          >
            <option value="included">Included in tuition / no extra charge</option>
            <option value="paid_extra">Paid extra class — charge separately</option>
          </Select>
          {form.cohort_fee_mode === "included" && (
            <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
              Enrolled students pay ₦0 to book this class. Any pool cost stored below is not an
              additional tuition charge.
            </p>
          )}
        </>
      )}
      {/* Event link — REQUIRED for Event sessions (discriminator rule). */}
      {form.session_type === "event" && (
        <Select
          label="Event"
          disabled={linkedEventSession}
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
      {form.session_type === "club" && (
        <fieldset disabled={publishedClub} className="space-y-4">
          <ClubSessionScopeFields
            clubId={form.club_id}
            scope={clubScope}
            podId={form.pod_id}
            onClubChange={handleClubChange}
            onScopeChange={handleScopeChange}
            onPodChange={handlePodChange}
          />
          <Select
            label="Club access mode"
            value={form.club_access_mode}
            onChange={(e) =>
              setForm({
                ...form,
                club_access_mode: e.target.value as NonNullable<Session["club_access_mode"]>,
              })
            }
          >
            <option value="plan_included">Quarter schedule — included for prepaid members</option>
            <option value="active_club">Extra practice — free for prepaid members</option>
            <option value="paid_addon">Separate paid swim — all Club members pay</option>
          </Select>
          <ClubAccessModeHint mode={form.club_access_mode} />
        </fieldset>
      )}
      <PoolPicker
        label="Pool"
        disabled={publishedClub || linkedEventSession}
        value={form.pool_id}
        onChange={(poolId, poolName) =>
          setForm({
            ...form,
            pool_id: poolId,
            location_name: poolName ?? null,
          })
        }
        hint={
          publishedClub
            ? "Published Club sessions keep their pool and audience. Use the reschedule action to move the swim."
            : form.session_type === "club"
              ? "Prefilled from the selected Club or Pod. You can change it for this session."
              : "Managed at Admin → Pool Registry."
        }
      />
      {selectedPod?.default_pool_id && form.pool_id !== selectedPod.default_pool_id && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>
            This Pod normally swims at {podDefaultPoolName ?? "its default pool"}. You can keep the
            current pool for this session or restore the Pod default.
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={publishedClub}
            className="shrink-0"
            onClick={() => applyDefaultPool(selectedPod.default_pool_id!)}
          >
            Use Pod default
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Start Time"
          disabled={publishedClub || linkedEventSession}
          type="datetime-local"
          value={form.starts_at}
          onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          required
        />
        <Input
          label="End Time"
          disabled={publishedClub || linkedEventSession}
          type="datetime-local"
          value={form.ends_at}
          onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          required
        />
      </div>
      {publishedClub && session && (
        <RescheduleClubPractice
          sessionId={session.id}
          onChanged={async () => {
            const updated = await apiGet<Session>(`/api/v1/sessions/${session.id}`, { auth: true });
            setForm((old) => ({
              ...old,
              starts_at: formatDateTimeLocal(new Date(updated.starts_at)),
              ends_at: formatDateTimeLocal(new Date(updated.ends_at)),
            }));
          }}
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={
            form.session_type === "cohort_class" && form.cohort_fee_mode === "included"
              ? "Stored session rate (₦)"
              : "Booking price per attendee (₦)"
          }
          type="number"
          min={0}
          step="0.01"
          value={
            form.pricing_mode === "cost_plus"
              ? Number(costPlusBookingPrice.toFixed(2))
              : form.pool_fee
          }
          onChange={(e) => setForm({ ...form, pool_fee: Number(e.target.value) || 0 })}
          hint={
            form.session_type === "cohort_class"
              ? form.cohort_fee_mode === "included"
                ? "Stored session rate for costing/guests; enrolled students pay ₦0 because this class is included in tuition."
                : "Enrolled students pay this amount for the extra class. Discounts and Bubbles are available in the normal checkout."
              : undefined
          }
          disabled={form.pricing_mode === "cost_plus"}
          required
        />
        <Input
          label="Capacity"
          disabled={linkedEventSession}
          type="number"
          min={1}
          value={form.capacity}
          onChange={(e) =>
            setForm((current) => withSessionCapacity(current, parseInt(e.target.value) || 0))
          }
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
        <Input
          label="Guest rate (₦)"
          type="number"
          min={0}
          value={form.guest_fee}
          onChange={(e) => setForm({ ...form, guest_fee: e.target.value })}
          hint="Explicit guest rate. Enter 0 for free; blank disables self-paying guest checkout."
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
      </div>
      <GuestSessionSettingsFields value={guestSettings} onChange={setGuestSettings} />
      {form.session_type === "club" ? (
        <label className="flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-950">
          <input
            type="checkbox"
            checked={form.allows_community_dropins}
            onChange={(event) =>
              setForm({ ...form, allows_community_dropins: event.target.checked })
            }
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-700"
          />
          <span>
            <span className="block font-semibold">Allow Community drop-ins</span>
            Active annual SwimBuddz Membership is required. When enabled, the backend charges the
            Community drop-in rate above and applies normal capacity limits.
          </span>
        </label>
      ) : null}
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
            {form.session_type === "cohort_class" && form.cohort_fee_mode === "included" ? (
              "Enrolled students pay no additional fee. The stored session rate does not override tuition inclusion."
            ) : (
              <>
                Enter the amount each member pays in <strong>Booking price per attendee </strong>{" "}
                above.
              </>
            )}{" "}
            Capacity controls how many places can be booked; no cost breakdown is needed.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-cyan-100 bg-white p-3 text-xs leading-5 text-slate-600">
              <strong>1.</strong> Enter expected attendance, staff, and lanes. <strong>2.</strong>{" "}
              Load the pool rates or add costs yourself. <strong>3.</strong> Choose the margin. The
              calculated booking price is shown above and in the summary below.
              <p className="mt-2">
                Per-attendee costs stay per swimmer. Shared costs (for example, staff travel or lane
                hire) are divided by expected attendance, then your margin is added. This estimate
                sets the price before booking; actual turnout does not reprice paid bookings.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Expected attendees"
                type="number"
                min={1}
                max={form.capacity}
                hint="Swimmers expected to share the costs. Must not exceed session capacity."
                value={form.pricing_expected_attendees}
                onChange={(e) =>
                  setForm((current) =>
                    withExpectedAttendance(current, Math.max(parseInt(e.target.value) || 1, 1))
                  )
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
                onChange={(e) => {
                  const staff = Math.max(parseInt(e.target.value) || 0, 0);
                  setForm((current) => ({
                    ...current,
                    cost_lines: current.cost_lines.map((line) =>
                      line.charge_basis === "per_staff" && line.quantity === quoteStaff
                        ? { ...line, quantity: staff }
                        : line
                    ),
                  }));
                  setQuoteStaff(staff);
                }}
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
                    onChange={(e) => {
                      const basis = e.target.value as SessionCostLine["charge_basis"];
                      setForm((current) => ({
                        ...current,
                        cost_lines: current.cost_lines.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                charge_basis: basis,
                                quantity:
                                  basis === "per_attendee"
                                    ? current.pricing_expected_attendees
                                    : basis === "per_staff"
                                      ? quoteStaff
                                      : 1,
                              }
                            : item
                        ),
                      }));
                    }}
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
                    label="Quantity"
                    hint={
                      line.charge_basis === "per_staff"
                        ? "Staff paid this cost; the total is shared across swimmers."
                        : line.charge_basis === "per_attendee" &&
                            line.quantity !== form.pricing_expected_attendees
                          ? `Check quantity: ${form.pricing_expected_attendees} swimmers expected, but this line charges ${line.quantity}.`
                          : undefined
                    }
                    type="number"
                    min={0}
                    step="0.25"
                    value={line.quantity}
                    onChange={(e) => updateCostLine(index, "quantity", Number(e.target.value) || 0)}
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          cost_lines: form.cost_lines.filter((_, lineIndex) => lineIndex !== index),
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
                label={form.margin_type === "percentage" ? "Margin (%)" : "Margin per attendee (₦)"}
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
              <Metric
                label="Booking price"
                value={
                  form.session_type === "cohort_class" && form.cohort_fee_mode === "included"
                    ? 0
                    : costPlusBookingPrice
                }
              />
            </div>
          </>
        )}
      </fieldset>
      <Textarea
        label="Description (optional)"
        disabled={linkedEventSession}
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

      {mode === "edit" && session && (
        <SessionVolunteerOpportunitiesSection sessionId={session.id} />
      )}

      <VolunteerNeedsDraftSection
        needs={volunteerNeeds}
        onChange={setVolunteerNeeds}
        description={
          mode === "create"
            ? "Optional. Add roles only when this session needs volunteer support. They are opened to eligible members when the session is saved."
            : "Optional. Add another role only when this session needs one. Current opportunities are shown above."
        }
        defaultStartTime={form.starts_at.slice(11, 16)}
        defaultEndTime={form.ends_at.slice(11, 16)}
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
  );

  if (presentation === "page") return formContent;

  return (
    <Modal isOpen onClose={onClose} title={mode === "create" ? "Create Session" : "Edit Session"}>
      {formContent}
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
