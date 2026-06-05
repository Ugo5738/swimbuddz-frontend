"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
  getMyAvailability,
  saveMyAvailability,
  type AvailabilityCalendar,
  type BlackoutDate,
  type RecurringBlock,
  type WeekdayKey,
} from "@/lib/coach";
import { CalendarClock, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const SLOT_OPTIONS = [30, 45, 60, 90, 120];

export default function CoachAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recurring, setRecurring] = useState<RecurringBlock[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [minHours, setMinHours] = useState<string>(""); // "" = use 48h default
  const [timezone, setTimezone] = useState("Africa/Lagos");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getMyAvailability();
        if (!active) return;
        if (data.availability) {
          setRecurring(data.availability.recurring ?? []);
          setBlackouts(data.availability.blackouts ?? []);
          setSlotMinutes(data.availability.slot_minutes ?? 60);
          setTimezone(data.availability.timezone ?? "Africa/Lagos");
        }
        setMinHours(
          data.min_hours_between_sessions != null
            ? String(data.min_hours_between_sessions)
            : "",
        );
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load availability");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function addBlock(weekday: WeekdayKey) {
    setRecurring((prev) => [...prev, { weekday, start: "06:00", end: "08:00" }]);
  }
  function updateBlock(index: number, patch: Partial<RecurringBlock>) {
    setRecurring((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }
  function removeBlock(index: number) {
    setRecurring((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlackout() {
    setBlackouts((prev) => [...prev, { start: "", end: "", reason: "" }]);
  }
  function updateBlackout(index: number, patch: Partial<BlackoutDate>) {
    setBlackouts((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }
  function removeBlackout(index: number) {
    setBlackouts((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    for (const b of recurring) {
      if (!b.start || !b.end) return "Every time block needs a start and end time.";
      if (b.start >= b.end) return "A time block ends before it starts.";
    }
    for (const b of blackouts) {
      if (!b.start || !b.end) return "Every time-off entry needs both dates.";
      if (b.end < b.start) return "A time-off entry ends before it starts.";
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    const payload: {
      availability: AvailabilityCalendar;
      min_hours_between_sessions?: number | null;
    } = {
      availability: {
        timezone,
        recurring,
        blackouts: blackouts.map((b) => ({
          start: b.start,
          end: b.end,
          reason: b.reason?.trim() || undefined,
        })),
        slot_minutes: slotMinutes,
      },
      min_hours_between_sessions: minHours === "" ? null : Number(minHours),
    };
    try {
      await saveMyAvailability(payload);
      toast.success("Availability saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <CalendarClock className="h-6 w-6 text-cyan-600" /> Availability
        </h1>
        <p className="mt-1 text-slate-600">
          Publish the times you&rsquo;re generally free. Admin books make-ups and
          lessons against this &mdash; keeping it current saves the back-and-forth.
        </p>
      </header>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">Weekly availability</h2>
          <p className="text-sm text-slate-500">
            Recurring blocks, in {timezone.replace("_", " ")} time.
          </p>
        </div>
        <div className="space-y-4">
          {WEEKDAYS.map(({ key, label }) => {
            const dayBlocks = recurring
              .map((b, i) => ({ b, i }))
              .filter((x) => x.b.weekday === key);
            return (
              <div
                key={key}
                className="border-b border-slate-100 pb-3 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{label}</span>
                  <Button variant="ghost" size="sm" onClick={() => addBlock(key)}>
                    <Plus className="mr-1 h-4 w-4" /> Add time
                  </Button>
                </div>
                {dayBlocks.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-400">Unavailable</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {dayBlocks.map(({ b, i }) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          type="time"
                          hideLabel
                          label={`${label} start`}
                          value={b.start}
                          onChange={(e) => updateBlock(i, { start: e.target.value })}
                          className="w-32"
                        />
                        <span className="text-slate-400">to</span>
                        <Input
                          type="time"
                          hideLabel
                          label={`${label} end`}
                          value={b.end}
                          onChange={(e) => updateBlock(i, { end: e.target.value })}
                          className="w-32"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlock(i)}
                          aria-label="Remove time block"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Time off</h2>
            <p className="text-sm text-slate-500">
              Dates you&rsquo;re away (these override your weekly availability).
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={addBlackout}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        {blackouts.length === 0 ? (
          <p className="text-sm text-slate-400">No time off scheduled.</p>
        ) : (
          <div className="space-y-3">
            {blackouts.map((b, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Input
                  type="date"
                  label="From"
                  value={b.start}
                  onChange={(e) => updateBlackout(i, { start: e.target.value })}
                />
                <Input
                  type="date"
                  label="To"
                  value={b.end}
                  onChange={(e) => updateBlackout(i, { end: e.target.value })}
                />
                <Input
                  label="Reason (optional)"
                  value={b.reason ?? ""}
                  onChange={(e) => updateBlackout(i, { reason: e.target.value })}
                  placeholder="Travel"
                  className="min-w-[8rem] flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBlackout(i)}
                  aria-label="Remove time off"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-slate-900">Scheduling</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Default lesson length"
            value={String(slotMinutes)}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
          >
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
          <Input
            type="number"
            label="Min hours between a learner's sessions"
            hint="Leave blank to use the 48-hour default."
            min={0}
            max={336}
            value={minHours}
            onChange={(e) => setMinHours(e.target.value)}
            placeholder="48"
          />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-3xl">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}
