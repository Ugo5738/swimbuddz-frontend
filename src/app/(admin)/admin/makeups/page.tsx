"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { MembersApi, type Member } from "@/lib/members";
import {
  MAKEUP_ORIGINS,
  MakeupsApi,
  type BookableSlot,
  type MakeupBooking,
  type MakeupBookingCreate,
  type MakeupOrigin,
} from "@/lib/makeups";
import { CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmt(dt: string): string {
  return new Date(dt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMakeupsPage() {
  const [coaches, setCoaches] = useState<Member[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [pending, setPending] = useState<MakeupBooking[]>([]);

  const [coachId, setCoachId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(toISODate(today));
  const [toDate, setToDate] = useState(
    toISODate(new Date(today.getTime() + 14 * 86_400_000)),
  );

  const [slots, setSlots] = useState<BookableSlot[] | null>(null);
  const [availabilitySet, setAvailabilitySet] = useState(true);
  const [existing, setExisting] = useState<MakeupBooking[]>([]);
  const [searching, setSearching] = useState(false);

  // Booking modal state
  const [bookingFor, setBookingFor] = useState<BookableSlot | null>(null);
  const [origin, setOrigin] = useState<MakeupOrigin>("excused_absence");
  const [reason, setReason] = useState("");
  const [originalSessionId, setOriginalSessionId] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [obligationId, setObligationId] = useState("");
  const [usedGrace, setUsedGrace] = useState(false);
  const [spacingOverridden, setSpacingOverridden] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, m] = await Promise.all([
          MembersApi.listCoaches(),
          MembersApi.listMembers(0, 200),
        ]);
        if (!active) return;
        setCoaches(c ?? []);
        setMembers(m ?? []);
        await loadPending();
      } catch {
        if (active) toast.error("Failed to load coaches / members");
      } finally {
        if (active) setRefLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const label = (m: Member) =>
    `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email || m.id;

  async function loadPending() {
    try {
      setPending(await MakeupsApi.list({ status: "requested" }));
    } catch {
      /* non-fatal */
    }
  }

  async function confirmPending(id: string) {
    try {
      await MakeupsApi.confirmRequest(id);
      toast.success("Request confirmed");
      await loadPending();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm");
    }
  }

  async function findOptions() {
    if (!coachId || !learnerId) {
      toast.error("Pick a coach and a learner first.");
      return;
    }
    if (toDate < fromDate) {
      toast.error("'To' must be on or after 'From'.");
      return;
    }
    setSearching(true);
    setSlots(null);
    try {
      const [res, list] = await Promise.all([
        MakeupsApi.bookableSlots({
          coachId,
          learnerId,
          from: fromDate,
          to: toDate,
        }),
        MakeupsApi.listForLearner(learnerId),
      ]);
      setSlots(res.slots);
      setAvailabilitySet(res.availability_set);
      setExisting(list ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load options");
    } finally {
      setSearching(false);
    }
  }

  function openBooking(slot: BookableSlot) {
    setBookingFor(slot);
    setOrigin("excused_absence");
    setReason("");
    setOriginalSessionId("");
    setCohortId("");
    setObligationId("");
    setUsedGrace(false);
    setSpacingOverridden(!slot.ok); // pre-acknowledge spacing warnings
  }

  async function confirmBooking() {
    if (!bookingFor) return;
    if (origin === "learner_reschedule" && !reason.trim()) {
      toast.error("A reschedule needs a reason.");
      return;
    }
    const isOpen = bookingFor.kind === "open";
    if (isOpen && !originalSessionId.trim() && !cohortId.trim()) {
      toast.error(
        "For an open slot, give the original (missed) session ID or a cohort ID.",
      );
      return;
    }
    setSaving(true);
    try {
      if (isOpen) {
        const learner = members.find((m) => m.id === learnerId);
        await MakeupsApi.createOpenSlot({
          learner_member_id: learnerId,
          coach_member_id: coachId,
          starts_at: bookingFor.start,
          ends_at: bookingFor.end,
          capacity: 1, // a dedicated make-up is a single learner
          origin,
          reason: reason.trim() || null,
          original_session_id: originalSessionId.trim() || null,
          cohort_id: cohortId.trim() || null,
          title: learner ? `Make-up — ${label(learner)}` : null,
          obligation_id: obligationId.trim() || null,
          used_grace: usedGrace,
          spacing_overridden: spacingOverridden,
        });
      } else {
        const sessionId = bookingFor.session_id;
        if (!sessionId) return;
        const body: MakeupBookingCreate = {
          learner_member_id: learnerId,
          coach_member_id: coachId,
          scheduled_session_id: sessionId,
          origin,
          reason: reason.trim() || null,
          original_session_id: originalSessionId.trim() || null,
          obligation_id: obligationId.trim() || null,
          used_grace: usedGrace,
          spacing_overridden: spacingOverridden,
        };
        await MakeupsApi.confirm(body);
      }
      toast.success("Make-up confirmed");
      setBookingFor(null);
      await findOptions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm make-up");
    } finally {
      setSaving(false);
    }
  }

  if (refLoading) return <LoadingCard />;

  const joinable = (slots ?? []).filter((s) => s.kind === "join_session");
  const openSlots = (slots ?? []).filter((s) => s.kind === "open");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <CalendarClock className="h-6 w-6 text-cyan-600" /> Make-up scheduling
        </h1>
        <p className="mt-1 text-slate-600">
          Find a coach&rsquo;s open times and sessions a learner can join, then
          confirm a make-up. Spacing conflicts are flagged, not blocked.
        </p>
      </header>

      {pending.length > 0 ? (
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-slate-900">
            Pending requests ({pending.length})
          </h2>
          {pending.map((mk) => (
            <div
              key={mk.id}
              className="flex items-center justify-between gap-3 rounded-md border border-amber-100 bg-amber-50/40 p-3"
            >
              <div className="text-sm text-slate-700">
                <span className="font-medium">
                  {mk.origin.replace(/_/g, " ")}
                </span>
                {mk.notes ? ` — ${mk.notes}` : ""}
                {mk.created_at ? ` · ${fmt(mk.created_at)}` : ""}
              </div>
              <Button size="sm" onClick={() => confirmPending(mk.id)}>
                Confirm
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Coach"
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
          >
            <option value="">Select a coach&hellip;</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </Select>
          <Select
            label="Learner"
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
          >
            <option value="">Select a learner&hellip;</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {label(m)}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            label="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            label="To"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button onClick={findOptions} disabled={searching}>
          {searching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Find options
        </Button>
      </Card>

      {slots !== null ? (
        <>
          {!availabilitySet ? (
            <Alert variant="info">
              This coach hasn&rsquo;t published availability — only sessions with
              room are shown.
            </Alert>
          ) : null}

          <Card className="space-y-3 p-5">
            <h2 className="font-semibold text-slate-900">
              Sessions to join ({joinable.length})
            </h2>
            {joinable.length === 0 ? (
              <p className="text-sm text-slate-400">
                No joinable sessions in range.
              </p>
            ) : (
              joinable.map((s) => (
                <div
                  key={s.session_id}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3"
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {s.session_title ?? "Session"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {fmt(s.start)} &ndash; {fmt(s.end)} · {s.spots_left ?? 0}{" "}
                      spot(s) left
                    </div>
                    {!s.ok ? (
                      <div className="mt-1 text-xs text-amber-600">
                        ⚠ {(s.warnings ?? []).join("; ")}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant={s.ok ? "primary" : "secondary"}
                    onClick={() => openBooking(s)}
                  >
                    Book
                  </Button>
                </div>
              ))
            )}
          </Card>

          <Card className="space-y-2 p-5">
            <h2 className="font-semibold text-slate-900">
              Coach&rsquo;s open time ({openSlots.length})
            </h2>
            <p className="text-sm text-slate-500">
              Free slots — book one to spin up a dedicated make-up session at
              that time and confirm the learner in, in one step.
            </p>
            <div className="flex flex-wrap gap-2">
              {openSlots.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openBooking(s)}
                  className={`rounded-md border px-2 py-1 text-xs transition hover:bg-slate-50 ${s.ok ? "border-slate-200 text-slate-600" : "border-amber-200 text-amber-700"}`}
                  title={(s.warnings ?? []).join("; ")}
                >
                  {fmt(s.start)} &ndash; {fmt(s.end)}
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-2 p-5">
            <h2 className="font-semibold text-slate-900">
              Learner&rsquo;s make-ups ({existing.length})
            </h2>
            {existing.length === 0 ? (
              <p className="text-sm text-slate-400">None yet.</p>
            ) : (
              existing.map((mk) => (
                <div key={mk.id} className="text-sm text-slate-600">
                  <span className="font-medium capitalize">{mk.status}</span> ·{" "}
                  {mk.origin.replace(/_/g, " ")} ·{" "}
                  {mk.created_at ? fmt(mk.created_at) : ""}
                </div>
              ))
            )}
          </Card>
        </>
      ) : null}

      <Modal
        isOpen={bookingFor !== null}
        onClose={() => setBookingFor(null)}
        title="Confirm make-up"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {bookingFor?.kind === "open"
              ? "New dedicated make-up session"
              : (bookingFor?.session_title ?? "Session")}{" "}
            · {bookingFor ? fmt(bookingFor.start) : ""}
          </p>
          <Select
            label="Reason type"
            value={origin}
            onChange={(e) => setOrigin(e.target.value as MakeupOrigin)}
          >
            {MAKEUP_ORIGINS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Reason / notes"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={origin === "learner_reschedule" ? "Required" : "Optional"}
          />
          <Input
            label="Original (missed) session ID"
            hint={
              bookingFor?.kind === "open"
                ? "Sets the new session's cohort + the 14-day window. Give this or a cohort ID."
                : "Optional — enables the 14-day window + auto cohort block."
            }
            value={originalSessionId}
            onChange={(e) => setOriginalSessionId(e.target.value)}
          />
          {bookingFor?.kind === "open" ? (
            <Input
              label="Cohort ID"
              hint="Used for the new session if no original session ID is given."
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
            />
          ) : null}
          <Input
            label="Payout obligation ID"
            hint="Optional — flips the coach's cohort payout obligation to scheduled."
            value={obligationId}
            onChange={(e) => setObligationId(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={usedGrace}
              onChange={(e) => setUsedGrace(e.target.checked)}
            />
            Use the learner&rsquo;s grace for this block
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={spacingOverridden}
              onChange={(e) => setSpacingOverridden(e.target.checked)}
            />
            Override spacing warning (coach approved)
          </label>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setBookingFor(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={confirmBooking} disabled={saving}>
              {saving ? "Confirming…" : "Confirm make-up"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
