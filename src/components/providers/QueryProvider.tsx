"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * React Query provider wired with sensible defaults for the SwimBuddz app.
 *
 * - staleTime 2 min: most list pages don't need to refetch within a tab navigation
 * - gcTime 10 min: cached results survive brief navigations away
 * - refetchOnWindowFocus disabled: avoids thrashing for mobile users
 * - retry once on transient failures
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
