import { describe, expect, it } from "vitest";
import { shouldPollAdminQueues } from "./adminQueuePolling";

describe("admin queue polling", () => {
  it("polls normally in a visible tab", () => {
    expect(shouldPollAdminQueues("visible", false)).toBe(true);
  });

  it("does not poll from an inactive browser tab", () => {
    expect(shouldPollAdminQueues("hidden", false)).toBe(false);
  });

  it("avoids duplicate requests when a slow poll has not finished", () => {
    expect(shouldPollAdminQueues("visible", true)).toBe(false);
  });
});
