"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  type EmployeeRow,
  corporateApi,
} from "@/lib/corporate/api";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  programId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
};

/**
 * Bulk employee importer.
 *
 * Accepts pasted lines in one of three forms (auto-detected per line):
 *   Jane Doe, jane@acme.com
 *   Jane Doe, jane@acme.com, +234...
 *   Jane Doe<TAB>jane@acme.com<TAB>+234...
 *
 * Lines starting with `#` or blank lines are ignored.
 */
export function EmployeeBulkUpload({
  programId,
  isOpen,
  onClose,
  onAdded,
}: Props) {
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => parseLines(raw), [raw]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.rows.length === 0) {
      toast.error("Paste at least one row");
      return;
    }
    setSubmitting(true);
    try {
      const response = await corporateApi.bulkAddEmployees(programId, {
        employees: parsed.rows,
      });
      toast.success(
        `Added ${response.added} employee${response.added === 1 ? "" : "s"}` +
          (response.skipped_duplicates > 0
            ? ` (skipped ${response.skipped_duplicates} duplicate${
                response.skipped_duplicates === 1 ? "" : "s"
              })`
            : ""),
      );
      setRaw("");
      onAdded();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add employees";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add employees to program">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-slate-600 space-y-1">
          <p>
            Paste one employee per line. Commas or tabs separate fields:
          </p>
          <code className="block p-2 bg-slate-50 rounded text-xs text-slate-700">
            Jane Doe, jane@acme.com
            <br />
            John Smith, john@acme.com, +234 800 1234567
          </code>
          <p className="text-xs">
            Lines starting with <code>#</code> are ignored. Duplicates (by
            email) are skipped automatically.
          </p>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={10}
          placeholder="Jane Doe, jane@acme.com"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <strong>{parsed.rows.length}</strong> valid row
            {parsed.rows.length === 1 ? "" : "s"}
          </span>
          {parsed.errors.length > 0 && (
            <span className="text-rose-700">
              {parsed.errors.length} invalid line
              {parsed.errors.length === 1 ? "" : "s"} (will be skipped)
            </span>
          )}
        </div>

        {parsed.errors.length > 0 && (
          <details className="text-xs text-slate-600 bg-rose-50 rounded p-2">
            <summary className="cursor-pointer text-rose-700 font-medium">
              See invalid lines
            </summary>
            <ul className="mt-2 space-y-1 pl-4 list-disc">
              {parsed.errors.slice(0, 10).map((err, i) => (
                <li key={i}>
                  Line {err.line}: <code>{err.text}</code> — {err.reason}
                </li>
              ))}
              {parsed.errors.length > 10 && (
                <li>…and {parsed.errors.length - 10} more</li>
              )}
            </ul>
          </details>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || parsed.rows.length === 0}
          >
            {submitting
              ? "Adding…"
              : `Add ${parsed.rows.length} employee${
                  parsed.rows.length === 1 ? "" : "s"
                }`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Parser ─────────────────────────────────────────────────────────────

type ParseError = { line: number; text: string; reason: string };
type ParsedInput = { rows: EmployeeRow[]; errors: ParseError[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseLines(raw: string): ParsedInput {
  const rows: EmployeeRow[] = [];
  const errors: ParseError[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    // Split on tab OR comma (any number of either, with surrounding whitespace).
    const parts = line.split(/[\t,]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      errors.push({
        line: i + 1,
        text: line,
        reason: "need at least name and email",
      });
      continue;
    }
    const [fullName, email, phone] = parts;
    if (!EMAIL_RE.test(email)) {
      errors.push({ line: i + 1, text: line, reason: `bad email "${email}"` });
      continue;
    }
    rows.push({
      full_name: fullName,
      email,
      phone: phone || null,
    });
  }
  return { rows, errors };
}
