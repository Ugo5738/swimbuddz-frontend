"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console / monitoring. Never shown to the user.
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <ErrorState
        onRetry={reset}
        onSecondary={() => {
          window.location.href = "/";
        }}
      />
    </div>
  );
}
