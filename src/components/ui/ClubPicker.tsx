"use client";

/**
 * ClubPicker — searchable single-select for clubs.
 *
 * Mirrors CohortPicker. Hits the public `GET /api/v1/clubs` endpoint once
 * on mount, filters in-memory by typed query (name + location + slug).
 *
 * For optional fields: when nothing is selected, the picker shows a
 * placeholder; the parent receives `null` from `onChange` when the user
 * clicks "Clear".
 */

import { Input } from "@/components/ui/Input";
import { Club, listClubs } from "@/lib/clubs";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ClubPickerProps {
  /** Currently-selected club id (or null) */
  value: string | null;
  /** Called with a club id, or null when cleared */
  onChange: (clubId: string | null) => void;
  /** Optional label rendered above the picker */
  label?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Help text rendered under the picker */
  helpText?: string;
  /** Filter to only active clubs */
  activeOnly?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function ClubPicker({
  value,
  onChange,
  label,
  placeholder = "Search clubs…",
  helpText,
  activeOnly = true,
  disabled = false,
}: ClubPickerProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClubs(activeOnly)
      .then((data) => {
        if (!cancelled) setClubs(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOnly]);

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
    () => clubs.find((c) => c.id === value) ?? null,
    [clubs, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clubs.slice(0, 50);
    return clubs
      .filter((c) => {
        const haystack = [
          c.name,
          c.slug,
          c.location ?? "",
          c.id,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 50);
  }, [clubs, query]);

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
            <p className="truncate text-xs text-slate-500">
              {selected.slug}
              {selected.location ? ` · ${selected.location}` : ""}
              {!selected.is_active && " · inactive"}
            </p>
          </div>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Change club"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Clear club"
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
              placeholder="Search by name, slug, or location…"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clubs…
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm text-rose-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">
                {clubs.length === 0
                  ? "No clubs created yet — admins can add one from the Clubs admin page."
                  : "No clubs match."}
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
                        {c.slug}
                        {c.location ? ` · ${c.location}` : ""}
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
