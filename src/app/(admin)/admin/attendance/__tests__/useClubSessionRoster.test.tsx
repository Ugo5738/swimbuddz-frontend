import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiGet } from "@/lib/api";
import { useClubSessionRoster } from "../useClubSessionRoster";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));

const session = {
  id: "session-1", starts_at: "2026-10-17T08:00:00Z", session_type: "club",
  club_id: "yaba", pool_id: "rowe", pod_id: null,
  club_access_mode: "plan_included" as const, allows_visiting_club_members: false,
};

describe("Club session roster", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses dated session eligibility rather than old tier fields or all-member search", async () => {
    vi.mocked(apiGet).mockResolvedValue({ session_id: session.id, members: [
      { member_id: "comfort", name: "Comfort Example", email: "comfort@example.com", access_source: "club_transition" },
      { member_id: "uche", name: "Uche Example", email: "uche@example.com", access_source: "club_transition" },
    ] });
    const { result } = renderHook(() => useClubSessionRoster(session));
    await waitFor(() => expect(result.current.members).toHaveLength(2));
    const path = vi.mocked(apiGet).mock.calls[0][0];
    expect(path).toContain("/members/club-session-roster?");
    const query = new URL(String(path), "https://example.com").searchParams;
    expect(query.get("at")).toBe(session.starts_at);
    expect(query.get("club_id")).toBe("yaba");
    expect(query.get("pool_id")).toBe("rowe");
    expect(query.has("pod_id")).toBe(false);
  });

  it("does not reuse a previous Club's roster after the selected session changes", async () => {
    let resolveNext!: (value: unknown) => void;
    vi.mocked(apiGet).mockImplementationOnce(() => Promise.resolve({ session_id: session.id, members: [
      { member_id: "uche", name: "Uche", email: "uche@example.com", access_source: "club_transition" },
    ] })).mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));
    const { result, rerender } = renderHook((value) => useClubSessionRoster(value), { initialProps: session });
    await waitFor(() => expect(result.current.members).toHaveLength(1));
    rerender({ ...session, id: "session-2", club_id: "festac" });
    expect(result.current.members).toEqual([]);
    await act(async () => resolveNext({ session_id: "session-2", members: [] }));
    expect(result.current.members).toEqual([]);
  });
});
