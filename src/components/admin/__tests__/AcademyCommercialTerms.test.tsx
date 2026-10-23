import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { apiGet } from "@/lib/api";
import { AdminAcademyApi, type AcademyCommercialTermsPreview } from "@/lib/academy-admin";
import { AcademyCommercialTerms } from "../AcademyCommercialTerms";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/lib/academy-admin", () => ({
  AdminAcademyApi: { approveAcademyCommercialTerms: vi.fn() },
}));

const preview = (): AcademyCommercialTermsPreview => ({
  enrollment_id: "festac-learner", price_snapshot_kobo: 16_500_000,
  verified_cash_kobo: 0, installments: [], adjustments: [],
  can_create_installments: true,
  suggested_installments: [1, 2, 3].map((number) => ({
    number, amount_kobo: 5_500_000, due_at: "2026-10-19T23:00:00Z",
  })),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.mocked(apiGet).mockResolvedValue(preview());
  vi.mocked(AdminAcademyApi.approveAcademyCommercialTerms).mockResolvedValue({
    state: "completed", adjustment_id: "approved", idempotent: false,
  });
});

async function openReview(data = preview()) {
  vi.mocked(apiGet).mockResolvedValue(data);
  const onChanged = vi.fn(async () => {});
  render(<AcademyCommercialTerms enrollmentId="festac-learner" onChanged={onChanged} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Review terms" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Review terms" }));
  return onChanged;
}

function setTerms() {
  ["45000", "45000", "35000"].forEach((value, index) => {
    fireEvent.change(screen.getByLabelText(`Installment ${index + 1} amount (₦)`), { target: { value } });
  });
  fireEvent.change(screen.getByLabelText("Agreed total tuition (₦)"), { target: { value: "125000" } });
  fireEvent.change(screen.getByLabelText("Admin approval reason"), {
    target: { value: "Agreed Festac tuition of 125000 in three payments" },
  });
}

it("creates a 45k, 45k, 35k agreement before a plan or payment exists", async () => {
  const changed = await openReview();
  expect(screen.queryByLabelText(/historical coupon/i)).not.toBeInTheDocument();
  setTerms();
  fireEvent.click(screen.getByRole("button", { name: "Save agreed terms" }));
  await waitFor(() => expect(AdminAcademyApi.approveAcademyCommercialTerms).toHaveBeenCalledWith(
    "festac-learner", expect.objectContaining({
      expected_installments: [], expected_price_snapshot_kobo: 16_500_000,
      unpaid_installment_amounts_kobo: [4_500_000, 4_500_000, 3_500_000],
      historic_discount_kobo: 0, agreed_cash_total_kobo: 12_500_000,
      billing_mode: "installments",
    }),
  ));
  expect(changed).toHaveBeenCalledOnce();
});

it("changes every unpaid installment even when none has been paid", async () => {
  const data = preview();
  data.installments = [1, 2, 3].map((number) => ({
    id: `installment-${number}`, number, amount_kobo: 5_500_000, status: "pending", reference: null,
  }));
  await openReview(data);
  expect(screen.queryByLabelText("Payment plan")).not.toBeInTheDocument();
  setTerms();
  fireEvent.click(screen.getByRole("button", { name: "Save agreed terms" }));
  await waitFor(() => expect(AdminAcademyApi.approveAcademyCommercialTerms).toHaveBeenCalled());
  const body = vi.mocked(AdminAcademyApi.approveAcademyCommercialTerms).mock.calls[0][1];
  expect(body.expected_installments).toEqual(data.installments);
  expect(body.billing_mode).toBeUndefined();
  expect(body.unpaid_installment_amounts_kobo).toEqual([4_500_000, 4_500_000, 3_500_000]);
});

it("saves a full-payment agreement without creating installment obligations", async () => {
  await openReview();
  fireEvent.change(screen.getByLabelText("Payment plan"), { target: { value: "full" } });
  fireEvent.change(screen.getByLabelText("Agreed total tuition (₦)"), { target: { value: "125000" } });
  fireEvent.change(screen.getByLabelText("Admin approval reason"), {
    target: { value: "Approved Festac full payment tuition of 125000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save agreed terms" }));
  await waitFor(() => expect(AdminAcademyApi.approveAcademyCommercialTerms).toHaveBeenCalledWith(
    "festac-learner", expect.objectContaining({
      billing_mode: "full", unpaid_installment_amounts_kobo: [12_500_000],
      agreed_cash_total_kobo: 12_500_000,
    }),
  ));
});

it("keeps Chiamaka's settled first installment and historical coupon", async () => {
  const data = preview();
  data.price_snapshot_kobo = 15_000_000;
  data.verified_cash_kobo = 5_000_000;
  data.installments = [5_500_000, 5_000_000, 4_500_000].map((amount_kobo, index) => ({
    id: `installment-${index + 1}`, number: index + 1, amount_kobo,
    status: index === 0 ? "paid" : "pending", reference: index === 0 ? "paid-ref" : null,
  }));
  data.adjustments = [{
    id: "prior", reason: "Couple tuition agreement", actor_auth_id: "admin",
    created_at: "2026-10-10T03:42:17Z", approved_terms: { historic_discount_kobo: 500_000 },
  }];
  await openReview(data);
  expect(screen.queryByLabelText("Installment 1 amount (₦)")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Already applied historical coupon (₦)")).toHaveValue("5000");
  expect(screen.getByLabelText("Agreed total tuition (₦)")).toHaveValue("145000");
  fireEvent.change(screen.getByLabelText("Admin approval reason"), {
    target: { value: "Reviewed existing agreement; settled payment stays intact" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Approve future-only adjustment" }));
  await waitFor(() => expect(AdminAcademyApi.approveAcademyCommercialTerms).toHaveBeenCalledWith(
    "festac-learner", expect.objectContaining({
      unpaid_installment_amounts_kobo: [5_000_000, 4_500_000],
      historic_discount_kobo: 500_000, agreed_cash_total_kobo: 14_500_000,
    }),
  ));
});

it("requires a matching total and minimum deposit before saving", async () => {
  await openReview();
  setTerms();
  fireEvent.change(screen.getByLabelText("Agreed total tuition (₦)"), { target: { value: "124000" } });
  expect(screen.getByRole("button", { name: "Save agreed terms" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Agreed total tuition (₦)"), { target: { value: "125000" } });
  fireEvent.change(screen.getByLabelText("Installment 1 amount (₦)"), { target: { value: "10000" } });
  fireEvent.change(screen.getByLabelText("Installment 3 amount (₦)"), { target: { value: "70000" } });
  expect(screen.getByText(/first installment must cover at least one-third/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save agreed terms" })).toBeDisabled();
});

it("shows a retry when payment verification fails", async () => {
  vi.mocked(apiGet).mockRejectedValue(new Error("Unresolved payment attempt; reconcile first"));
  render(<AcademyCommercialTerms enrollmentId="festac-learner" onChanged={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unresolved payment attempt");
  expect(screen.getByRole("button", { name: "Review terms" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});
