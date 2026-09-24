import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useGuestCapability } from "../useGuestCapability";

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});
afterEach(cleanup);

it("reads and remembers the session invitation fragment independently of approval tokens", async () => {
  window.history.replaceState({}, "", "/guest-pass/session/one#invite=session-specific-invitation");
  sessionStorage.setItem("guest-booking:one", "old-approval");
  const invitation = renderHook(() => useGuestCapability("guest-invite:one", "invite"));
  const approval = renderHook(() => useGuestCapability("guest-booking:one"));
  await waitFor(() => expect(invitation.result.current.ready).toBe(true));
  expect(invitation.result.current.token).toBe("session-specific-invitation");
  expect(approval.result.current.token).toBe("");
  expect(sessionStorage.getItem("guest-booking:one")).toBeNull();
  invitation.unmount();
  window.history.replaceState({}, "", "/guest-pass/session/one");
  const restored = renderHook(() => useGuestCapability("guest-invite:one", "invite"));
  await waitFor(() => expect(restored.result.current.token).toBe("session-specific-invitation"));
});

it("does not reuse another session's saved invitation", async () => {
  sessionStorage.setItem("guest-invite:one", "one-only");
  const two = renderHook(() => useGuestCapability("guest-invite:two", "invite"));
  await waitFor(() => expect(two.result.current.ready).toBe(true));
  expect(two.result.current.token).toBe("");
});
