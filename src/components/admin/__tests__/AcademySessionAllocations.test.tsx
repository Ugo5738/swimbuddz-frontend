import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AcademySessionAllocations } from "../AcademySessionAllocations";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), refreshed: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockImplementation((url: string) => {
    if (url.includes("/cohorts/cohort/enrollments")) {
      return Promise.resolve([{ id: "enrollment", member_id: "member", status: "enrolled" }]);
    }
    if (url.includes("/class-entitlements")) {
      return Promise.resolve({
        configured: true,
        purchased_classes: 12,
        opening_consumed: 3,
        applied_prepaid: 0,
        reserved_prepaid: 0,
        remaining: 9,
      });
    }
    return Promise.reject(new Error(`Unexpected endpoint: ${url}`));
  });
  mocks.post.mockResolvedValue({
    booking_id: "booking",
    kind: "paid_extra",
    fee_amount_kobo: 1_500_000,
    payment_status: "outstanding",
    entitlement_status: "applied",
  });
});

it("records a paid Academy extra without consuming an included class", async () => {
  render(
    <AcademySessionAllocations
      enrollments={[{ id: "enrollment", member_id: "member", status: "enrolled" }]}
      sessionId="physical"
      standardFeeNaira={15000}
      memberNames={{ member: "Student B" }}
      onRecorded={mocks.refreshed}
    />
  );
  await screen.findByRole("option", { name: "Student B" });
  fireEvent.change(screen.getByLabelText("Student"), { target: { value: "enrollment" } });
  await screen.findByText(/Remaining:/);
  fireEvent.change(screen.getByLabelText("How this student is attending"), {
    target: { value: "paid_extra" },
  });
  fireEvent.change(screen.getByLabelText(/Agreed additional price in naira/), {
    target: { value: "15000" },
  });
  fireEvent.change(screen.getByLabelText(/Reason \/ agreement/), {
    target: { value: "Separate Saturday extra lesson" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Record student participation" }));
  await waitFor(() =>
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/sessions/physical/admin/academy-participation",
      {
        member_id: "member",
        enrollment_id: "enrollment",
        kind: "paid_extra",
        agreed_fee_kobo: 1_500_000,
        expected_standard_fee_kobo: 1_500_000,
        override_reason: null,
        reason: "Separate Saturday extra lesson",
      },
      { auth: true }
    )
  );
  expect(mocks.refreshed).toHaveBeenCalledOnce();
});

it("prepaid allocation records no additional charge", async () => {
  render(
    <AcademySessionAllocations
      enrollments={[{ id: "enrollment", member_id: "member", status: "enrolled" }]}
      sessionId="physical"
      standardFeeNaira={15000}
      memberNames={{ member: "Student A" }}
      onRecorded={mocks.refreshed}
    />
  );
  await screen.findByRole("option", { name: "Student A" });
  fireEvent.change(screen.getByLabelText("Student"), { target: { value: "enrollment" } });
  await screen.findByText(/Remaining:/);
  fireEvent.change(screen.getByLabelText(/Reason \/ agreement/), {
    target: { value: "Twice weekly from existing tuition" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Record student participation" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
    "/api/v1/sessions/physical/admin/academy-participation",
    {
      member_id: "member",
      enrollment_id: "enrollment",
      kind: "prepaid",
      agreed_fee_kobo: 0,
      reason: "Twice weekly from existing tuition",
    },
    { auth: true }
  ));
});

it.each(["prepaid", "paid_extra"])("requires a clear reason for %s participation", async (kind) => {
  render(<AcademySessionAllocations
    enrollments={[{ id: "enrollment", member_id: "member", status: "enrolled" }]}
    sessionId="physical" standardFeeNaira={15000} memberNames={{ member: "Bello" }} onRecorded={mocks.refreshed}
  />);
  fireEvent.change(screen.getByLabelText("Student"), { target: { value: "enrollment" } });
  await screen.findByText(/Remaining:/);
  fireEvent.change(screen.getByLabelText("How this student is attending"), { target: { value: kind } });
  const reason = screen.getByLabelText(/Reason \/ agreement/);
  expect(reason).toBeRequired();
  fireEvent.click(screen.getByRole("button", { name: "Record student participation" }));
  expect(reason).toHaveFocus();
  expect(reason).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("at least 10 characters");
  expect(mocks.post).not.toHaveBeenCalled();
  fireEvent.change(reason, { target: { value: "   short  " } });
  fireEvent.click(screen.getByRole("button", { name: "Record student participation" }));
  expect(mocks.post).not.toHaveBeenCalled();
  fireEvent.change(reason, { target: { value: "Saturday lesson from purchased classes" } });
  expect(reason).toHaveAttribute("aria-invalid", "false");
});

it("prefills the standard Academy price and requires a reason for overrides", async () => {
  render(<AcademySessionAllocations
    enrollments={[{ id: "enrollment", member_id: "member", status: "enrolled" }]}
    sessionId="physical" standardFeeNaira={15000} memberNames={{ member: "Ajibola" }}
    onRecorded={mocks.refreshed}
  />);
  fireEvent.change(screen.getByLabelText("Student"), { target: { value: "enrollment" } });
  await screen.findByText(/Remaining:/);
  fireEvent.change(screen.getByLabelText("How this student is attending"), { target: { value: "paid_extra" } });
  const price = screen.getByLabelText(/Agreed additional price in naira/);
  expect(price).toHaveValue(15000);
  fireEvent.change(price, { target: { value: "10000" } });
  expect(screen.getByText(/5,000 reduction/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Reason \/ agreement/), { target: { value: "Extra class agreed with student" } });
  fireEvent.click(screen.getByRole("button", { name: "Record student participation" }));
  expect(mocks.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Reason for price override/), { target: { value: "Approved partial scholarship" } });
  fireEvent.click(screen.getByRole("button", { name: "Record student participation" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
    "/api/v1/sessions/physical/admin/academy-participation",
    expect.objectContaining({
      kind: "paid_extra",
      agreed_fee_kobo: 1_000_000,
      expected_standard_fee_kobo: 1_500_000,
      override_reason: "Approved partial scholarship",
    }),
    { auth: true }
  ));
});
