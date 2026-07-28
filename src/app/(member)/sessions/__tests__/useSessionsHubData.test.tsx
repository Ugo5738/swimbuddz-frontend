import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/lib/academy", () => ({
  AcademyApi: {
    getMyEnrollments: vi.fn(),
    getOpenCohorts: vi.fn(),
  },
}));

vi.mock("@/lib/tiers", () => ({
  getMembershipLabel: vi.fn(() => "Community"),
  getPaidMembershipTier: vi.fn(() => "community"),
}));

import { AcademyApi } from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";

import { useSessionsHubData } from "../useSessionsHubData";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const mockedApiGet = vi.mocked(apiGet);
const mockedApiPost = vi.mocked(apiPost);
const mockedEnrollments = vi.mocked(AcademyApi.getMyEnrollments);
const mockedOpenCohorts = vi.mocked(AcademyApi.getOpenCohorts);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSessionsHubData", () => {
  it("loads independent resources concurrently and defers past sessions", async () => {
    const profile = deferred<Record<string, unknown>>();
    const attendance = deferred<never[]>();
    const bookings = deferred<never[]>();
    const upcoming = deferred<Array<{ id: string; starts_at: string }>>();
    const past = deferred<Array<{ id: string; starts_at: string }>>();
    const enrollments = deferred<never[]>();
    const cohorts = deferred<never[]>();

    mockedApiGet.mockImplementation((path: string) => {
      if (path === "/api/v1/members/me") return profile.promise;
      if (path.startsWith("/api/v1/attendance/me")) return attendance.promise;
      if (path.startsWith("/api/v1/sessions/bookings/me")) return bookings.promise;
      if (path.includes("/api/v1/sessions?types=")) return upcoming.promise;
      if (path.includes("/api/v1/sessions?") && path.includes("from=")) {
        return past.promise;
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    mockedApiPost.mockResolvedValue({ configs: {} });
    mockedEnrollments.mockReturnValue(enrollments.promise);
    mockedOpenCohorts.mockReturnValue(cohorts.promise);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result, rerender } = renderHook(({ loadPast }) => useSessionsHubData({ loadPast }), {
      initialProps: { loadPast: false },
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledTimes(4);
      expect(mockedEnrollments).toHaveBeenCalledTimes(1);
      expect(mockedOpenCohorts).toHaveBeenCalledTimes(1);
    });
    expect(mockedApiGet.mock.calls.some(([path]) => String(path).includes("from="))).toBe(false);

    await act(async () => {
      upcoming.resolve([
        {
          id: "upcoming-1",
          starts_at: "2035-01-01T10:00:00Z",
        },
      ]);
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    expect(result.current.upcomingLoading).toBe(false);
    expect(result.current.bookingsLoading).toBe(true);
    expect(result.current.attendanceLoading).toBe(true);

    rerender({ loadPast: true });
    await waitFor(() =>
      expect(mockedApiGet.mock.calls.some(([path]) => String(path).includes("from="))).toBe(true)
    );
    expect(result.current.pastLoading).toBe(true);

    await act(async () => {
      past.resolve([
        {
          id: "past-1",
          starts_at: "2034-12-01T10:00:00Z",
        },
      ]);
      profile.resolve({});
      attendance.resolve([]);
      bookings.resolve([]);
      enrollments.resolve([]);
      cohorts.resolve([]);
    });

    await waitFor(() => expect(result.current.pastSessions).toHaveLength(1));
    expect(result.current.pastLoading).toBe(false);
  });
});
