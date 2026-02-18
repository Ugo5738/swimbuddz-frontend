"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Loader2, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface GenerateSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    title: string;
    day_of_week: number;
  } | null;
  onGenerate: (
    templateId: string,
    weeks: number,
    skipConflicts: boolean,
  ) => Promise<any>;
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

export function GenerateSessionsModal({
  isOpen,
  onClose,
  template,
  onGenerate,
}: GenerateSessionsModalProps) {
  const [weeks, setWeeks] = useState("8");
  const [skipConflicts, setSkipConflicts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setWeeks("8");
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
      const weeksNum = parseInt(weeks);
      if (isNaN(weeksNum) || weeksNum < 1 || weeksNum > 52) {
        setError("Please enter a number between 1 and 52");
        setLoading(false);
        return;
      }

      const res = await onGenerate(template.id, weeksNum, skipConflicts);
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
                Every {DAY_NAMES[template.day_of_week]}
              </p>
            </div>

            <Input
              label="Number of weeks to generate"
              type="number"
              min="1"
              max="52"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              placeholder="8"
            />

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
                  {result.conflicts.map((conflict: any, idx: number) => (
                    <li key={idx}>
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
