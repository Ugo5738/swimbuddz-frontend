"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loader2, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export type GenerateSessionsResult = {
  created: number;
  skipped: number;
  conflicts: Array<{ date: string; reason: string }>;
};

interface GenerateSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    title: string;
    day_of_week: number;
    frequency?: "weekly" | "monthly" | "quarterly" | "annual";
    interval?: number;
    week_of_month?: number | null;
    month_of_year?: number | null;
  } | null;
  onGenerate: (
    templateId: string,
    request: {
      weeks?: number;
      from_date?: string;
      to_date?: string;
      dates?: string[];
      skip_conflicts: boolean;
    }
  ) => Promise<GenerateSessionsResult>;
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function recurrenceSummary(
  template: NonNullable<GenerateSessionsModalProps["template"]>,
): string {
  const frequency = template.frequency ?? "weekly";
  const interval = template.interval ?? 1;
  if (frequency === "weekly") {
    return interval === 1
      ? `Every ${DAY_NAMES[template.day_of_week]}`
      : `Every ${interval} weeks on ${DAY_NAMES[template.day_of_week]}`;
  }

  const week =
    template.week_of_month === -1
      ? "Last"
      : ["First", "Second", "Third", "Fourth", "Fifth"][(template.week_of_month ?? 1) - 1];
  const weekday = DAY_NAMES[template.day_of_week];
  if (frequency === "annual") {
    const month = MONTH_NAMES[(template.month_of_year ?? 1) - 1];
    return `${week} ${weekday} of ${month} every ${interval === 1 ? "year" : `${interval} years`}`;
  }
  const unit = frequency === "quarterly" ? "quarter" : "month";
  return `${week} ${weekday} every ${interval === 1 ? unit : `${interval} ${unit}s`}`;
}

export function GenerateSessionsModal({
  isOpen,
  onClose,
  template,
  onGenerate,
}: GenerateSessionsModalProps) {
  const [mode, setMode] = useState<"rolling" | "range" | "date">("rolling");
  const [weeks, setWeeks] = useState("8");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [specificDate, setSpecificDate] = useState("");
  const [skipConflicts, setSkipConflicts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateSessionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode("rolling");
      setWeeks("8");
      setFromDate("");
      setToDate("");
      setSpecificDate("");
      setSkipConflicts(true);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!template) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const request: Parameters<typeof onGenerate>[1] = { skip_conflicts: skipConflicts };
      if (mode === "rolling") {
        const weeksNum = parseInt(weeks);
        if (isNaN(weeksNum) || weeksNum < 1 || weeksNum > 52) {
          throw new Error("Please enter a number between 1 and 52");
        }
        request.weeks = weeksNum;
      } else if (mode === "range") {
        if (!fromDate || !toDate) throw new Error("Choose both range dates");
        if (toDate < fromDate) throw new Error("The end date must be after the start date");
        request.from_date = fromDate;
        request.to_date = toDate;
      } else {
        if (!specificDate) throw new Error("Choose the session date");
        request.dates = [specificDate];
      }

      const res = await onGenerate(template.id, request);
      setResult(res);

      // Auto-close and show toast after success
      toast.success(
        `Generated ${res.created} session${res.created !== 1 ? "s" : ""}`,
      );
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate sessions",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Sessions from Template"
    >
      <div className="space-y-4">
        {!result ? (
          <>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                {template.title}
              </p>
              <p className="text-xs text-slate-600">
                {recurrenceSummary(template)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Generation window">
              {([
                ["rolling", "Next weeks"],
                ["range", "Date range"],
                ["date", "One date"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    mode === value
                      ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "rolling" ? (
              <Input
                label="Number of weeks to scan"
                type="number"
                min="1"
                max="52"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                placeholder="8"
                hint="Only dates matching the template recurrence are generated."
              />
            ) : mode === "range" ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="From"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <Input
                  label="To"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            ) : (
              <Input
                label="Specific session date"
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                hint="Creates this exact date even when it is outside the template's normal weekday rule."
              />
            )}

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={skipConflicts}
                onChange={(e) => setSkipConflicts(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  Skip conflicting dates
                </p>
                <p className="text-xs text-slate-600">
                  Don't create sessions if one already exists at the same time
                </p>
              </div>
            </label>

            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    <span>Generate</span>
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert
              variant="info"
              title={`Successfully generated ${result.created} session${result.created !== 1 ? "s" : ""}`}
            >
              {result.skipped > 0 && (
                <p className="mt-1 text-sm">
                  Skipped {result.skipped} conflicting date
                  {result.skipped !== 1 ? "s" : ""}
                </p>
              )}
            </Alert>

            {result.conflicts && result.conflicts.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-yellow-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-900">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Skipped Dates</span>
                </div>
                <ul className="space-y-1 text-xs text-yellow-800">
                  {result.conflicts.map((conflict) => (
                    <li key={`${conflict.date}-${conflict.reason}`}>
                      {new Date(conflict.date).toLocaleDateString()} -{" "}
                      {conflict.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
