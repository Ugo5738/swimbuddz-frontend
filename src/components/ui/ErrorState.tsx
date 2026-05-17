"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ErrorStateProps = {
  /** Short human-readable headline. */
  title?: string;
  /** Optional detail line. Never render raw error objects to users. */
  description?: string;
  /** When provided, renders a "Try again" button (Next.js error.tsx reset). */
  onRetry?: () => void;
  /** When provided, renders a secondary link/button (e.g. "Go home"). */
  onSecondary?: () => void;
  secondaryLabel?: string;
};

/**
 * Shared error UI for App Router `error.tsx` boundaries and inline failures.
 * Keeps every boundary visually consistent and ensures we never dump a raw
 * exception/stack at the user (CLAUDE.md security guidance).
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We hit an unexpected error. Please try again.",
  onRetry,
  onSecondary,
  secondaryLabel = "Go home",
}: ErrorStateProps) {
  return (
    <Card className="mx-auto my-12 max-w-md p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        {onSecondary && (
          <Button variant="outline" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
