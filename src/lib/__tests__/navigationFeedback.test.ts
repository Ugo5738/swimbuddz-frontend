import { describe, expect, it } from "vitest";
import { getNavigationDestination } from "../navigationFeedback";

const current = new URL("https://swimbuddz.com/account");
function click(anchor: HTMLAnchorElement, overrides: Partial<MouseEventInit> = {}) {
  document.body.appendChild(anchor);
  const event = new MouseEvent("click", { button: 0, bubbles: true, ...overrides });
  anchor.dispatchEvent(event);
  const result = getNavigationDestination(event, current);
  anchor.remove();
  return result;
}

describe("navigation feedback eligibility", () => {
  it("identifies internal link navigation", () => {
    const a = document.createElement("a");
    a.href = "/account/bookings";
    expect(click(a)).toBe("/account/bookings");
  });

  it("ignores same-page and hash-only links", () => {
    const a = document.createElement("a");
    a.href = "https://swimbuddz.com/account#profile";
    expect(click(a)).toBeNull();
  });

  it("ignores external and new-tab links", () => {
    const a = document.createElement("a");
    a.href = "https://analyzer.swimbuddz.com";
    expect(click(a)).toBeNull();
    a.href = "/account/bookings";
    a.target = "_blank";
    expect(click(a)).toBeNull();
  });

  it("ignores modified clicks, non-primary clicks and downloads", () => {
    const a = document.createElement("a");
    a.href = "/account/bookings";
    expect(click(a, { ctrlKey: true })).toBeNull();
    expect(click(a, { button: 1 })).toBeNull();
    a.download = "download";
    expect(click(a)).toBeNull();
  });

  it("includes query-only navigation", () => {
    const a = document.createElement("a");
    a.href = "/account?tab=payments";
    expect(click(a)).toBe("/account?tab=payments");
  });
});
