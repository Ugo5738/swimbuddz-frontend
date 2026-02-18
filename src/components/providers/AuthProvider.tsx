"use client";

import { useEffect } from "react";
import { initAuthListener } from "@/lib/auth";

/**
 * AuthProvider initializes the auth state change listener on mount.
 * Wrap your app with this to handle session errors gracefully.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAuthListener();
  }, []);

  return <>{children}</>;
}
