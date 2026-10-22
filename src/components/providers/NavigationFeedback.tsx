"use client";

import { getNavigationDestination } from "@/lib/navigationFeedback";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Navigation acknowledgement is independent of route data and middleware.
 * Users should know their click registered even when the destination is slow.
 * The indicator is intentionally non-blocking (no full-screen overlay).
 */
export function NavigationFeedback() {
  const pathname = usePathname();
  const params = useSearchParams();
  const routeKey = `${pathname}?${params.toString()}`;
  const [pending, setPending] = useState(false);
  const lastRoute = useRef(routeKey);

  useEffect(() => {
    if (lastRoute.current !== routeKey) {
      lastRoute.current = routeKey;
      setPending(false);
    }
  }, [routeKey]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (getNavigationDestination(event, new URL(window.location.href))) {
        setPending(true);
      }
    };
    const handlePopState = () => setPending(false);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    // An intercepted or failed navigation must never leave a permanent loader.
    const timeout = window.setTimeout(() => setPending(false), 15000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Opening page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-cyan-100"
    >
      <div className="h-full w-1/3 animate-pulse bg-cyan-600" />
      <span className="sr-only">Opening page…</span>
    </div>
  );
}
