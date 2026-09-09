"use client";

import { Input } from "@/components/ui/Input";
import { getClub, type Club } from "@/lib/clubs";
import { adminGetPod, adminListPods, podDisplayName, type PodSummary } from "@/lib/pods";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type PodPickerProps = {
  value: string | null | undefined;
  clubId: string | null | undefined;
  onChange: (podId: string | null, pod?: PodSummary | null) => void;
  label?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
};

/** Searchable admin picker scoped to one Club.
 *
 * Repeated Pod names are intentional across Clubs, so the parent Club is
 * always shown as context and included in each option's accessible name.
 */
export function PodPicker({
  value,
  clubId,
  onChange,
  label = "Pod",
  helpText,
  required = false,
  disabled = false,
}: PodPickerProps) {
  const id = useId();
  const listboxId = `${id}-options`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setQuery("");
    setHighlightIndex(0);

    if (!clubId) {
      setClub(null);
      setPods([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void Promise.all([getClub(clubId), adminListPods({ clubId, status: "active" })])
      .then(async ([nextClub, activePods]) => {
        let nextPods = activePods;
        if (value && !activePods.some((pod) => pod.id === value)) {
          const current = await adminGetPod(value).catch(() => null);
          if (current?.club_id === clubId) nextPods = [current, ...activePods];
        }
        if (!cancelled) {
          setClub(nextClub);
          setPods(nextPods);
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to load pods");
          setPods([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clubId, value]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = useMemo(() => pods.find((pod) => pod.id === value) ?? null, [pods, value]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pods;
    return pods.filter((pod) =>
      [
        podDisplayName(pod),
        pod.name,
        pod.slug,
        pod.handle ?? "",
        club?.name ?? "",
        club?.location ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [club, pods, query]);

  const contextLabel = [club?.name, club?.location].filter(Boolean).join(" · ");
  const unavailable = disabled || !clubId || loading;

  const choose = (pod: PodSummary) => {
    onChange(pod.id, pod);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pod = filtered[highlightIndex];
      if (pod) choose(pod);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>

      {selected && !open ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {podDisplayName(selected)}
              {club?.name ? ` — ${club.name}` : ""}
            </p>
            <p className="truncate text-xs text-slate-500">
              {[club?.location, `${selected.active_member_count}/${selected.max_size} members`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span title="Selected">
            <Check className="h-4 w-4 text-emerald-500" />
          </span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Change pod"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null, null)}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Clear pod"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="relative">
          <Input
            id={id}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setHighlightIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={unavailable}
            placeholder={
              !clubId ? "Select a Club first" : loading ? "Loading pods…" : "Search pods…"
            }
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-required={required}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>
      )}

      {open && !unavailable && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {error ? (
            <p className="px-3 py-3 text-sm text-rose-600">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">
              {pods.length === 0 ? "No active pods belong to this Club." : "No pods match."}
            </p>
          ) : (
            filtered.map((pod, index) => {
              const name = podDisplayName(pod);
              const highlighted = index === highlightIndex;
              return (
                <button
                  key={pod.id}
                  type="button"
                  role="option"
                  aria-selected={pod.id === value}
                  aria-label={[name, contextLabel].filter(Boolean).join(", ")}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => choose(pod)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    highlighted ? "bg-cyan-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">{name}</span>
                  <span className="text-xs text-slate-500">
                    {[contextLabel, `${pod.active_member_count}/${pod.max_size} members`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {error && !open && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {helpText && !error && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}
