import { describe, expect, it } from "vitest";

import type { SessionWithRides } from "@/components/sessions/SessionCard";

import { isSessionRelevant } from "../utils";

function session(
  values: Pick<SessionWithRides, "id"> & Partial<SessionWithRides>
): SessionWithRides {
  return values as SessionWithRides;
}

const baseContext = {
  bookedSessionIds: new Set<string>(),
  enrolledCohortIds: new Set(["cohort-mine"]),
  myPodId: "pod-mine",
};

describe("isSessionRelevant", () => {
  it("keeps booked, own-Pod, own-cohort, and generally bookable sessions", () => {
    expect(
      isSessionRelevant(session({ id: "booked", pod_id: "pod-other" }), {
        ...baseContext,
        bookedSessionIds: new Set(["booked"]),
      })
    ).toBe(true);
    expect(isSessionRelevant(session({ id: "pod", pod_id: "pod-mine" }), baseContext)).toBe(true);
    expect(
      isSessionRelevant(session({ id: "cohort", cohort_id: "cohort-mine" }), baseContext)
    ).toBe(true);
    expect(
      isSessionRelevant(session({ id: "general", access: { bookable: true } as never }), baseContext)
    ).toBe(true);
  });

  it("hides another member's Pod or cohort from the default view", () => {
    expect(isSessionRelevant(session({ id: "pod", pod_id: "pod-other" }), baseContext)).toBe(false);
    expect(
      isSessionRelevant(session({ id: "cohort", cohort_id: "cohort-other" }), baseContext)
    ).toBe(false);
  });
});
