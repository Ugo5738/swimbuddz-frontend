import { beforeEach, expect, it } from "vitest";
import { productCheckoutAttempt } from "../productCheckoutAttempt";

beforeEach(() => localStorage.clear());
it("resumes lost responses with the same key across refreshed displayed totals", () => {
  const first = productCheckoutAttempt("ay", {
    purpose: "club",
    bubbles_to_apply: 10,
    expected_total_kobo: 100,
  });
  expect(
    productCheckoutAttempt("ay", {
      purpose: "club",
      bubbles_to_apply: 10,
      expected_total_kobo: 200,
    }).idempotencyKey
  ).toBe(first.idempotencyKey);
  expect(
    productCheckoutAttempt("uche", { purpose: "club", bubbles_to_apply: 10 }).idempotencyKey
  ).not.toBe(first.idempotencyKey);
  first.complete();
  expect(
    productCheckoutAttempt("ay", { purpose: "club", bubbles_to_apply: 10 }).idempotencyKey
  ).not.toBe(first.idempotencyKey);
});
