"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

type UseApiOptions = {
  /** Send the Supabase bearer token (default true for member/admin data). */
  auth?: boolean;
  /** When false, the request is skipped (e.g. waiting on a param). */
  enabled?: boolean;
};

type UseApiResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Manually re-run the request (e.g. after a mutation). */
  refetch: () => void;
};

/**
 * Canonical GET-with-state hook. Replaces the hand-rolled
 * `useState(loading)/useEffect(fetch)/catch` triad duplicated across
 * ~50 components (review finding F5/FU5).
 *
 * - Aborts the in-flight request on unmount or when `path` changes, so
 *   a slow response can't set state on an unmounted component or clobber
 *   a newer request.
 * - Surfaces a friendly error string, never a raw exception (CLAUDE.md
 *   security guidance — components render `error` directly).
 * - `path = null` or `enabled = false` → no request (conditional fetch).
 *
 * Migrate components to this on touch; it's the foundation for the
 * raw-`fetch()` cleanup. New code should use this (or React Query for
 * cache-sharing cases) rather than re-implementing the triad.
 *
 * Usage:
 *   const { data, loading, error, refetch } =
 *     useApi<Member>("/api/v1/members/me");
 */
export function useApi<T>(
  path: string | null,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { auth = true, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(
    enabled && path !== null,
  );
  // Bumped by refetch() to re-trigger the effect without changing path.
  const [nonce, setNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || path === null) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    let active = true;
    setLoading(true);
    setError(null);

    apiGet<T>(path, { auth, signal: controller.signal })
      .then((result) => {
        if (!active || controller.signal.aborted) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        // AbortError is expected on unmount / path change — not a real error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      })
      .finally(() => {
        if (active && !controller.signal.aborted) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [path, auth, enabled, nonce]);

  return { data, error, loading, refetch };
}
