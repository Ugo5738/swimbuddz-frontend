import { describe, expect, it } from "vitest";

import {
  memberStartPathLabel,
  requestedProgrammesForPath,
  startPathFromGoal,
} from "./memberPaths";

describe("member start paths", () => {
  it("keeps Club and Academy requests independent", () => {
    expect(requestedProgrammesForPath("club")).toEqual(["club"]);
    expect(requestedProgrammesForPath("academy")).toEqual(["academy"]);
    expect(requestedProgrammesForPath("community")).toEqual([]);
  });

  it("accepts only known campaign goals", () => {
    expect(startPathFromGoal(" CLUB ")).toBe("club");
    expect(startPathFromGoal("academy")).toBe("academy");
    expect(startPathFromGoal("vip")).toBeNull();
    expect(startPathFromGoal(null)).toBeNull();
  });

  it("uses product language in the registration summary", () => {
    expect(memberStartPathLabel("community")).toBe("SwimBuddz Membership");
    expect(memberStartPathLabel("club")).toBe("Join Club");
    expect(memberStartPathLabel("academy")).toBe("Learn through Academy");
  });
});
