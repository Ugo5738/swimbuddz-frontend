"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Cohort } from "@/lib/upgradeContext";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { useMemo, useState } from "react";

const DAYS: { value: string; label: string }[] = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const TIMES: { value: string; label: string; hint: string }[] = [
  { value: "morning", label: "Morning", hint: "7am–11am" },
  { value: "afternoon", label: "Afternoon", hint: "12pm–5pm" },
  { value: "evening", label: "Evening", hint: "5pm–9pm" },
];

export type LateJoinPreferences = {
  sessionsMissed: number;
  availableDays: string[];
  availableTimes: string[];
  notes: string;
  acknowledgedAt: string;
};

export type LateJoinContext = {
  isLateJoin: boolean;
  weeksElapsed: number;
  sessionsMissed: number;
  cohortDurationWeeks: number;
};

/** Pure helper — compute join context relative to `now`. */
export function computeLateJoinContext(cohort: Cohort, now: Date = new Date()): LateJoinContext {
  const start = cohort.start_date ? new Date(cohort.start_date) : null;
  const duration = cohort.duration_weeks ?? cohort.program?.duration_weeks ?? 12;

  if (!start || Number.isNaN(start.getTime())) {
    return {
      isLateJoin: false,
      weeksElapsed: 0,
      sessionsMissed: 0,
      cohortDurationWeeks: duration,
    };
  }

  const diffMs = now.getTime() - start.getTime();
  // A member joining within the first week is considered on-time.
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return {
      isLateJoin: false,
      weeksElapsed: 0,
      sessionsMissed: 0,
      cohortDurationWeeks: duration,
    };
  }

  const weeksElapsed = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  // One regular session per week; the session at start-of-week N is missed
  // once that week has fully passed.
  return {
    isLateJoin: true,
    weeksElapsed,
    sessionsMissed: weeksElapsed,
    cohortDurationWeeks: duration,
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (prefs: LateJoinPreferences) => void;
  cohort: Cohort;
  context: LateJoinContext;
};

export function LateJoinDisclosureModal({ isOpen, onClose, onContinue, cohort, context }: Props) {
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const toggle = (list: string[], setter: (v: string[]) => void, value: string) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const startDateLabel = useMemo(() => {
    if (!cohort.start_date) return "—";
    return new Date(cohort.start_date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [cohort.start_date]);

  const handleContinue = () => {
    onContinue({
      sessionsMissed: context.sessionsMissed,
      availableDays: days,
      availableTimes: times,
      notes: notes.trim(),
      acknowledgedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Heads up — you're joining mid-cohort">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">
              {cohort.name} started on {startDateLabel}.
            </p>
            <p className="mt-1">
              You'd be joining in <strong>Week {context.weeksElapsed + 1}</strong> of{" "}
              {context.cohortDurationWeeks}. You'll need to complete{" "}
              <strong>
                {context.sessionsMissed} make-up{" "}
                {context.sessionsMissed === 1 ? "session" : "sessions"}
              </strong>{" "}
              to cover the content you missed.
            </p>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Make-ups are usually scheduled on weekdays outside the cohort's regular Saturday class.
          Tell us when you're typically free so we can match you with a coach.
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <Calendar className="h-4 w-4 text-slate-500" />
            Days you're usually available
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const active = days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggle(days, setDays, d.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <Clock className="h-4 w-4 text-slate-500" />
            Times that work for you
          </label>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => {
              const active = times.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggle(times, setTimes, t.value)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                  <span className="ml-1 text-xs opacity-80">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="late-join-notes"
            className="mb-1 block text-sm font-medium text-slate-800"
          >
            Anything else about your availability?{" "}
            <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="late-join-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. I can only do evenings after 6pm because of work."
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleContinue}>I understand — continue to checkout</Button>
        </div>
      </div>
    </Modal>
  );
}
