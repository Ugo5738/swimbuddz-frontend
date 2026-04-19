"use client";

import { apiGet } from "@/lib/api";
import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PoolOption {
  id: string;
  name: string;
  partnership_status: string;
  location_area: string | null;
  is_active: boolean;
}

interface PoolListResponse {
  items: PoolOption[];
  total: number;
}

type PoolPickerProps = {
  value: string | null | undefined;
  onChange: (poolId: string | null, poolName?: string | null) => void;
  /**
   * Restrict to active partners only. Default is false — admin gets every
   * active pool (prospect, evaluating, active_partner) since they may need
   * to schedule a trial session at a pool we're still evaluating.
   */
  activePartnersOnly?: boolean;
  className?: string;
  required?: boolean;
  id?: string;
  label?: string;
  hint?: string;
};

// Module-level cache so repeated mounts don't refetch constantly.
type CacheEntry = { data: PoolOption[]; fetchedAt: number };
const POOL_CACHE: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 2 * 60 * 1000;

async function fetchPools(activePartnersOnly: boolean): Promise<PoolOption[]> {
  const cacheKey = activePartnersOnly ? "active-partners" : "all-active";
  const cached = POOL_CACHE[cacheKey];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams();
  // Backend caps page_size at 100; more than that is unlikely for admin
  // curation, and we'll swap to server-side search if it ever overflows.
  params.set("page_size", "100");
  params.set("is_active", "true");
  if (activePartnersOnly) {
    params.set("partnership_status", "active_partner");
  }
  const resp = await apiGet<PoolListResponse>(`/api/v1/admin/pools?${params.toString()}`, {
    auth: true,
  });
  const items = (resp.items ?? []).filter(
    // Server-side `is_active=true` already filters most, but be defensive
    // against backend quirks and never surface rejected/inactive pools
    // unless explicitly asked.
    (p) =>
      p.is_active &&
      (activePartnersOnly
        ? p.partnership_status === "active_partner"
        : p.partnership_status !== "inactive" && p.partnership_status !== "rejected")
  );
  POOL_CACHE[cacheKey] = { data: items, fetchedAt: Date.now() };
  return items;
}

/**
 * Searchable pool dropdown. Type to filter, click to select.
 *
 * Replaces the hardcoded SessionLocation enum everywhere a session, cohort,
 * template, event, or ride route needs a pool reference. The onChange
 * callback returns both pool_id and the resolved display name so callers
 * can populate legacy location_name without an extra lookup.
 */
export function PoolPicker({
  value,
  onChange,
  activePartnersOnly = false,
  className = "",
  required = false,
  id,
  label,
  hint,
}: PoolPickerProps) {
  const [pools, setPools] = useState<PoolOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch pools once per "variant" (active-only vs all).
  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchPools(activePartnersOnly)
      .then((data) => {
        if (!cancelled) setPools(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load pools");
          setPools([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activePartnersOnly]);

  // Sync the input text with the externally-controlled `value` so when a
  // caller programmatically sets/clears the pool, the input matches.
  useEffect(() => {
    if (!pools) return;
    if (value === null || value === undefined) {
      setQuery("");
      return;
    }
    const selected = pools.find((p) => p.id === value);
    if (selected) setQuery(selected.name);
  }, [value, pools]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered =
    pools?.filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || (p.location_area?.toLowerCase().includes(q) ?? false)
      );
    }) ?? [];

  // If the input matches a pool exactly by id, no need to show the dropdown.
  const selectedPool = value && pools ? pools.find((p) => p.id === value) : null;

  const pickPool = (pool: PoolOption) => {
    onChange(pool.id, pool.name);
    setQuery(pool.name);
    setOpen(false);
  };

  const clear = () => {
    onChange(null, null);
    setQuery("");
    setHighlightIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = filtered[highlightIndex];
      if (hit) pickPool(hit);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-rose-600"> *</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          value={query}
          placeholder={pools === null ? "Loading pools..." : "Search or pick a pool..."}
          disabled={pools === null}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIndex(0);
            // Clear the selection as soon as the user edits the text so we
            // don't leave a stale pool_id paired with a mismatched display
            // string.
            if (value) onChange(null, null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 pr-20 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white disabled:opacity-60"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedPool && (
            <span title="Selected">
              <Check className="h-4 w-4 text-emerald-500" />
            </span>
          )}
          {query && (
            <button
              type="button"
              onClick={clear}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="p-1 rounded hover:bg-slate-100 text-slate-400"
            aria-label="Toggle options"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {open && pools !== null && (
          <div
            role="listbox"
            className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                {pools.length === 0
                  ? "No pools match. Add one at Admin → Pool Registry."
                  : "No pools match your search."}
              </div>
            ) : (
              filtered.map((pool, idx) => {
                const isSelected = pool.id === value;
                const isHighlighted = idx === highlightIndex;
                return (
                  <button
                    key={pool.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => pickPool(pool)}
                    className={`block w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${
                      isHighlighted
                        ? "bg-cyan-50 text-cyan-900"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <strong>{pool.name}</strong>
                        {pool.location_area && (
                          <span className="text-slate-400"> · {pool.location_area}</span>
                        )}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wide shrink-0 ${
                          pool.partnership_status === "active_partner"
                            ? "text-emerald-600"
                            : pool.partnership_status === "evaluating"
                              ? "text-amber-600"
                              : "text-slate-400"
                        }`}
                      >
                        {pool.partnership_status.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-rose-600">
          {error} — try refreshing or check the Pool Registry.
        </p>
      )}
      {pools !== null && pools.length === 0 && !error && (
        <p className="mt-1 text-xs text-amber-600">
          No {activePartnersOnly ? "active partner" : "active"} pools yet. Add one at{" "}
          <strong>Admin → Pool Registry</strong>.
        </p>
      )}
    </div>
  );
}
