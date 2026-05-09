"use client";

/**
 * CohortPicker — searchable single-select for academy cohorts.
 *
 * Hits the public `GET /api/v1/academy/cohorts` endpoint once on mount,
 * filters in-memory by typed query (name + program name).
 *
 * Designed for optional fields: when nothing is selected, the picker shows
 * a placeholder; the parent receives `null` from `onChange` when the user
 * clicks "Clear".
 */

import { Input } from "@/components/ui/Input";
import { apiEndpoints } from "@/lib/config";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CohortListItem {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  program?: { id: string; name: string } | null;
}

interface CohortPickerProps {
  /** Currently-selected cohort id (or null) */
  value: string | null;
  /** Called with a cohort id, or null when cleared */
  onChange: (cohortId: string | null) => void;
  /** Optional label rendered above the picker */
  label?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Help text rendered under the picker */
  helpText?: string;
  /** Filter to only OPEN/ACTIVE cohorts (closed/cancelled hidden) */
  activeOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function CohortPicker({
  value,
  onChange,
  label,
  placeholder = "Search cohorts…",
  helpText,
  activeOnly = false,
  disabled = false,
}: CohortPickerProps) {
  const [cohorts, setCohorts] = useState<CohortListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch cohorts once on mount. The list endpoint is public, so no auth
  // header is required.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${apiEndpoints.academy}/cohorts`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed (${response.status})`);
        }
        const data: CohortListItem[] = await response.json();
        if (!cancelled) setCohorts(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = useMemo(
    () => cohorts.find((c) => c.id === value) ?? null,
    [cohorts, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = cohorts;
    if (activeOnly) {
      list = list.filter(
        (c) => c.status === "open" || c.status === "active",
      );
    }
    if (!q) return list.slice(0, 50);
    return list
      .filter((c) => {
        const haystack = [
          c.name,
          c.program?.name ?? "",
          c.id,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 50);
  }, [cohorts, query, activeOnly]);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setQuery("");
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {selected.name}
            </p>
            {selected.program?.name && (
              <p className="truncate text-xs text-slate-500">
                {selected.program.name} · {selected.status}
              </p>
            )}
          </div>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Change cohort"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Clear cohort"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{placeholder}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by cohort or program…"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading cohorts…
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm text-rose-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">
                No cohorts match.
              </div>
            ) : (
              <ul role="listbox" className="py-1">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c.id)}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-cyan-50 ${
                        c.id === value ? "bg-cyan-50" : ""
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {c.program?.name ? `${c.program.name} · ` : ""}
                        {c.status}
                        {c.start_date
                          ? ` · ${new Date(c.start_date).toLocaleDateString()}`
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {helpText && (
        <p className="mt-1 text-xs text-slate-500">{helpText}</p>
      )}
    </div>
  );
}
