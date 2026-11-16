# Layout Components

Shared member, admin and other application layout primitives.

## Member sidebar profile request budget

`MemberLayout` owns the full `/api/v1/members/me` read for its mounted member
shell and supplies it through `MemberProfileContext`.

- The shell fetches on mount. Rapid in-app navigation does **not** refetch
  that full profile on every route change.
- Navigation may revalidate profile display data once per 60-second interval.
  A failed profile load can be retried on a subsequent navigation.
- Explicit profile edits and payment-return refetches are **not** throttled.
  Paystack callback retry remains bounded by its existing eight-attempt cap.
- This is only a display-data optimization. Entitlement, authorization and
  financial checks must remain authoritative and verified on the backend; no
  financial or access decision may rely on the sidebar's cached profile.
- The threshold is defined in `src/lib/member-profile-refresh.ts` and
  covered by `src/lib/member-profile-refresh.test.ts`.

Measure `/members/me` request volume and latency before/after deployment.
PostgreSQL query counters are cumulative and may include unrelated callers,
so they must not be presented as proof of an exact reduction without path logs.

## Admin operational-queue polling

AdminLayout polls pending payment reviews and new store orders every 30 seconds
**only when the browser tab is visible**. A background tab does not need to
keep loading those queues indefinitely. Returning to the tab immediately
refreshes both counts, while an in-flight refresh is allowed to finish before
another begins. Active-tab refresh cadence, order notifications and payment
review semantics are unchanged. `src/lib/adminQueuePolling.test.ts` covers
visibility and concurrency gating.
`__tests__/AdminLayout.test.tsx` also mounts the actual layout to verify hidden
initial loads, visible return, slow-request overlap and unmount cleanup.
