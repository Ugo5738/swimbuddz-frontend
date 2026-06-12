"use client";

import { MakeupGuidelines } from "@/components/makeups/MakeupGuidelines";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  MakeupsApi,
  type BookableSlot,
  type MakeupBooking,
  type MakeupRequestCreate,
} from "@/lib/makeups";
import { MembersApi, type Member } from "@/lib/members";
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

export default function MyMakeupsPage() {
  const [coaches, setCoaches] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachId, setCoachId] = useState("");
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(toISODate(today));
  const [toDate, setToDate] = useState(
    toISODate(new Date(today.getTime() + 14 * 86_400_000)),
  );
  const [slots, setSlots] = useState<BookableSlot[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [mine, setMine] = useState<MakeupBooking[]>([]);

  const [requestFor, setRequestFor] = useState<BookableSlot | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadMine() {
    try {
      setMine(await MakeupsApi.myRequests());
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const c = await MembersApi.listCoaches();
        if (active) setCoaches(c ?? []);
        await loadMine();
      } catch {
        if (active) toast.error("Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const label = (m: Member) =>
    `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email || m.id;

  async function findTimes() {
    if (!coachId) {
      toast.error("Pick a coach first.");
      return;
    }
    if (toDate < fromDate) {
      toast.error("'To' must be on or after 'From'.");
      return;
    }
    setSearching(true);
    setSlots(null);
    try {
      const res = await MakeupsApi.myOptions({
        coachId,
        from: fromDate,
        to: toDate,
      });
      setSlots(res.slots);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load times");
    } finally {
      setSearching(false);
    }
  }

  async function submitRequest() {
    const sessionId = requestFor?.session_id;
    if (!sessionId) return;
    if (!reason.trim()) {
      toast.error("Please add a brief reason.");
      return;
    }
    setSaving(true);
    const body: MakeupRequestCreate = {
      coach_member_id: coachId,
      scheduled_session_id: sessionId,
      origin: "learner_reschedule",
      reason: reason.trim(),
    };
    try {
      await MakeupsApi.request(body);
      toast.success("Make-up requested — your coach/admin will confirm it.");
      setRequestFor(null);
      setReason("");
      await loadMine();
      await findTimes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to request");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  const joinable = (slots ?? []).filter((s) => s.kind === "join_session");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <CalendarClock className="h-6 w-6 text-cyan-600" /> Make-up sessions
        </h1>
        <p className="mt-1 text-slate-600">
          Missed a session? Find a time with your coach and request a make-up.
        </p>
      </header>

      <MakeupGuidelines audience="learner" />

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Coach"
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
          >
            <option value="">Select&hellip;</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
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
        <Button onClick={findTimes} disabled={searching}>
          {searching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Find times
        </Button>
      </Card>

      {slots !== null ? (
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-slate-900">
            Available sessions ({joinable.length})
          </h2>
          {joinable.length === 0 ? (
            <p className="text-sm text-slate-400">
              No open sessions in this range — try a wider window or another
              coach.
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
                  <div className="text-sm text-slate-500">{fmt(s.start)}</div>
                  {!s.ok ? (
                    <div className="mt-1 text-xs text-amber-600">
                      ⚠ {(s.warnings ?? []).join("; ")}
                    </div>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setRequestFor(s);
                    setReason("");
                  }}
                >
                  Request
                </Button>
              </div>
            ))
          )}
        </Card>
      ) : null}

      <Card className="space-y-2 p-5">
        <h2 className="font-semibold text-slate-900">
          My make-ups ({mine.length})
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-400">None yet.</p>
        ) : (
          mine.map((m) => (
            <div key={m.id} className="text-sm text-slate-600">
              <span className="font-medium capitalize">{m.status}</span>
              {m.created_at ? ` · requested ${fmt(m.created_at)}` : ""}
            </div>
          ))
        )}
      </Card>

      <Modal
        isOpen={requestFor !== null}
        onClose={() => setRequestFor(null)}
        title="Request make-up"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {requestFor?.session_title ?? "Session"} ·{" "}
            {requestFor ? fmt(requestFor.start) : ""}
          </p>
          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. work travel, illness"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setRequestFor(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={submitRequest} disabled={saving}>
              {saving ? "Requesting…" : "Request"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
