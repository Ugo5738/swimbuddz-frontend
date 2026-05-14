import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock the API client before importing the component
vi.mock("@/lib/academy", () => ({
  AcademyApi: {
    withdrawEnrollment: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { AcademyApi } from "@/lib/academy";
import { toast } from "sonner";
import { WithdrawEnrollmentModal } from "../WithdrawEnrollmentModal";

describe("WithdrawEnrollmentModal", () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    enrollmentId: "enr-1",
    cohortName: "Beginner Freestyle Apr 2026",
    programName: "Beginner Freestyle: Zero to 50 Meters",
    onWithdrawn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<WithdrawEnrollmentModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText(/Withdraw from cohort/)).not.toBeInTheDocument();
  });

  it("renders cohort and program names in the header", () => {
    render(<WithdrawEnrollmentModal {...baseProps} />);
    expect(
      screen.getByText(/Beginner Freestyle: Zero to 50 Meters/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Beginner Freestyle Apr 2026/)).toBeInTheDocument();
  });

  it("disables the submit button until confirmation checkbox is ticked", () => {
    render(<WithdrawEnrollmentModal {...baseProps} />);
    const submit = screen.getByRole("button", { name: /Withdraw from cohort$/ });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
  });

  it("calls the API and onWithdrawn on successful submit", async () => {
    (AcademyApi.withdrawEnrollment as any).mockResolvedValue({
      enrollment_id: "enr-1",
      status: "DROPPED",
      window: "mid_entry_window",
      refund_kobo: 5_000_000,
      refund_percent: 0.5,
      paid_kobo: 10_000_000,
      waived_installment_count: 2,
      payment_references: ["PAY-1"],
      refund_note: "Refund of NGN 50,000.00 owed",
    });

    const onWithdrawn = vi.fn();
    render(
      <WithdrawEnrollmentModal {...baseProps} onWithdrawn={onWithdrawn} />,
    );

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(
      screen.getByPlaceholderText(/Help us understand/),
      { target: { value: "Schedule conflict" } },
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Withdraw from cohort$/ }),
    );

    await waitFor(() => {
      expect(AcademyApi.withdrawEnrollment).toHaveBeenCalledWith("enr-1", {
        reason: "Schedule conflict",
      });
    });
    await waitFor(() => {
      expect(onWithdrawn).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("sends no reason when textarea is empty", async () => {
    (AcademyApi.withdrawEnrollment as any).mockResolvedValue({
      enrollment_id: "enr-1",
      status: "DROPPED",
      window: "after_cutoff",
      refund_kobo: 0,
      refund_percent: 0,
      paid_kobo: 10_000_000,
      waived_installment_count: 0,
      payment_references: [],
      refund_note: "No refund per policy",
    });

    render(<WithdrawEnrollmentModal {...baseProps} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: /Withdraw from cohort$/ }),
    );

    await waitFor(() => {
      expect(AcademyApi.withdrawEnrollment).toHaveBeenCalledWith("enr-1", {
        reason: undefined,
      });
    });
  });

  it("surfaces API errors via toast and does NOT close the modal", async () => {
    (AcademyApi.withdrawEnrollment as any).mockRejectedValue(
      new Error("network blew up"),
    );

    const onWithdrawn = vi.fn();
    render(
      <WithdrawEnrollmentModal {...baseProps} onWithdrawn={onWithdrawn} />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: /Withdraw from cohort$/ }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("network blew up");
    });
    expect(onWithdrawn).not.toHaveBeenCalled();
  });
});
