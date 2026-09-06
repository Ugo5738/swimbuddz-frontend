import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditCohortModal } from "../EditCohortModal";
import {
  AcademyApi,
  CohortStatus,
  LocationType,
  ProgramLevel,
  type Cohort,
} from "@/lib/academy";

const cohort: Cohort = {
  id: "cohort-1",
  program_id: "program-1",
  name: "Saturday Beginners",
  start_date: "2026-10-03T08:00:00Z",
  end_date: "2026-12-19T08:00:00Z",
  capacity: 12,
  status: CohortStatus.OPEN,
  timezone: "Africa/Lagos",
  location_type: LocationType.POOL,
  location_name: "Rowe Park",
  location_address: "Yaba",
  allow_mid_entry: false,
  admin_dropout_approval: false,
  price_override: 150_000,
  membership_policy_override: "active_required",
  installment_plan_enabled: true,
  installment_count: 3,
  installment_deposit_amount: 50_000,
  notes_internal: "",
  program: {
    id: "program-1",
    name: "Beginner One",
    level: ProgramLevel.BEGINNER_1,
    duration_weeks: 12,
    price_amount: 140_000,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("EditCohortModal", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and saves price, membership policy, and installment settings", async () => {
    const update = vi.spyOn(AcademyApi, "updateCohort").mockResolvedValue({
      ...cohort,
      price_override: 180_000,
      membership_policy_override: "included",
      installment_count: 4,
      installment_deposit_amount: 60_000,
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <EditCohortModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        cohort={cohort}
      />,
    );

    const price = await screen.findByLabelText(/price override/i);
    expect(price).toHaveValue(150_000);
    expect(screen.getByLabelText(/annual membership policy/i)).toHaveValue(
      "active_required",
    );
    expect(screen.getByLabelText(/allow members to choose installment/i)).toBeChecked();

    fireEvent.change(price, { target: { value: "180000" } });
    fireEvent.change(screen.getByLabelText(/annual membership policy/i), {
      target: { value: "included" },
    });
    fireEvent.change(screen.getByLabelText(/installment count/i), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText(/deposit \/ first installment/i), {
      target: { value: "60000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        cohort.id,
        expect.objectContaining({
          price_override: 180_000,
          membership_policy_override: "included",
          installment_plan_enabled: true,
          installment_count: 4,
          installment_deposit_amount: 60_000,
        }),
      ),
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
