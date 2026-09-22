import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TransferPage from "./page";

const mocks = vi.hoisted(() => ({ post: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ reference: "PAY-TEST" }) }));
vi.mock("@/lib/api", () => ({ apiPost: mocks.post, apiUpload: mocks.upload }));
const pending = {
  reference: "PAY-TEST",
  purpose: "session_booking",
  amount_kobo: 1500000,
  currency: "NGN",
  status: "pending",
  fulfilled: false,
  receipt_attached: false,
};

describe("private bank transfer receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "token=private-capability";
    mocks.post.mockImplementation(async (path: string) =>
      path.endsWith("/submit") ? { ...pending, status: "pending_review" } : pending
    );
    mocks.upload.mockResolvedValue({ ...pending, receipt_attached: true });
  });
  it("shows the company account and submits existing transfer without claiming payment succeeded", async () => {
    render(<TransferPage />);
    expect(await screen.findByText("6567710856")).toBeInTheDocument();
    expect(screen.getByText("Swimbuddz Limited")).toBeInTheDocument();
    expect(screen.getByText("Moniepoint MFB")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Bank transaction reference/), {
      target: { value: "BANK-ONE" },
    });
    fireEvent.change(screen.getByLabelText(/Transfer date/), { target: { value: "2026-09-13" } });
    fireEvent.change(screen.getByLabelText(/Receipt image/), {
      target: { files: [new File(["proof"], "receipt.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit transfer for review" }));
    await screen.findByText(/Transfer submitted for Admin verification/);
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/payments/manual-transfer/PAY-TEST/submit", {
      access_token: "private-capability",
      external_reference: "BANK-ONE",
      received_date: "2026-09-13",
    });
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.upload.mock.calls[0][1].get("access_token")).toBe("private-capability");
    expect(screen.queryByText(/Your access has been confirmed/)).not.toBeInTheDocument();
  });
  it("retains a successful upload if transfer submission fails, without uploading twice", async () => {
    mocks.post.mockImplementation(async (path: string) => {
      if (path.endsWith("/submit")) throw new Error("Try again");
      return pending;
    });
    render(<TransferPage />);
    await screen.findByText("6567710856");
    fireEvent.change(screen.getByLabelText(/Bank transaction reference/), {
      target: { value: "BANK-ONE" },
    });
    fireEvent.change(screen.getByLabelText(/Transfer date/), { target: { value: "2026-09-13" } });
    fireEvent.change(screen.getByLabelText(/Receipt image/), {
      target: { files: [new File(["proof"], "receipt.pdf")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit transfer for review" }));
    await screen.findByText("Try again");
    fireEvent.click(screen.getByRole("button", { name: "Submit transfer for review" }));
    await waitFor(() =>
      expect(mocks.post.mock.calls.filter((call) => call[0].endsWith("/submit"))).toHaveLength(2)
    );
    expect(mocks.upload).toHaveBeenCalledOnce();
  });
  it("does not expose payment data without a private link", async () => {
    window.location.hash = "";
    render(<TransferPage />);
    await screen.findByText(/Open the private transfer link/);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("does not ask a paid payer to transfer again", async () => {
    mocks.post.mockResolvedValue({ ...pending, status: "paid", fulfilled: true });
    render(<TransferPage />);
    await screen.findByText(/Your access has been confirmed/);
    expect(screen.queryByText("6567710856")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Submit transfer for review" })
    ).not.toBeInTheDocument();
  });
});
