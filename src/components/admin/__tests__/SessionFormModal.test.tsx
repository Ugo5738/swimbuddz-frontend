import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionFormModal } from "../SessionFormModal";

vi.mock("@/components/admin/PoolPicker", () => ({
  PoolPicker: () => <div data-testid="pool-picker" />,
  getPoolOption: vi.fn(async () => ({ id: "pool-rowe", name: "Rowe Park Pool" })),
}));

vi.mock("@/components/admin/ClubSessionScopeFields", () => ({
  ClubSessionScopeFields: ({
    scope,
    onClubChange,
    onScopeChange,
    onPodChange,
  }: {
    scope: "general" | "pod";
    onClubChange: (id: string, club: unknown) => void;
    onScopeChange: (scope: "general" | "pod") => void;
    onPodChange: (id: string, pod: unknown) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onClubChange("club-lagos", {
            id: "club-lagos",
            name: "Lagos Mainland Club",
            default_pool_id: "pool-rowe",
          })
        }
      >
        Select Lagos Club
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "general"}
        onClick={() => onScopeChange("general")}
      >
        General Club
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "pod"}
        onClick={() => onScopeChange("pod")}
      >
        Pod-specific
      </button>
      {scope === "pod" && (
        <button
          type="button"
          onClick={() =>
            onPodChange("pod-orca", {
              id: "pod-orca",
              club_id: "club-lagos",
              name: "Orca",
              default_pool_id: "pool-rowe",
            })
          }
        >
          Select Orca pod
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/admin/VolunteerNeedsDraftSection", () => ({
  VolunteerNeedsDraftSection: ({ onChange }: { onChange: (needs: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange([
          {
            role_id: "role-checkin",
            role_title: "Check-in",
            slots_needed: 1,
            opportunity_type: "open_claim",
            min_tier: "tier_1",
            title_override: "",
          },
        ])
      }
    >
      Add test volunteer need
    </button>
  ),
}));

vi.mock("@/lib/pods", () => ({
  adminGetPod: vi.fn(),
}));

vi.mock("@/lib/academy", () => ({
  AcademyApi: {
    listCohorts: vi.fn(async () => [
      { id: "cohort-1", name: "September cohort", status: "active" },
    ]),
  },
  CohortStatus: { COMPLETED: "completed", CANCELLED: "cancelled" },
}));

function renderModal(onCreate = vi.fn()) {
  render(
    <SessionFormModal
      mode="create"
      rideAreas={[]}
      submitting={false}
      onClose={vi.fn()}
      onCreate={onCreate}
      onUpdate={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: "Saturday Club Swim" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Select Lagos Club" }));
  return onCreate;
}

describe("SessionFormModal Club scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates stale attendance when capacity changes and keeps manual per-person pricing", async () => {
    const create = renderModal();
    fireEvent.change(screen.getByLabelText(/^Capacity/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/^Booking price per attendee/), {
      target: { value: "9800.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0][0]).toMatchObject({
      capacity: 2,
      pricing_expected_attendees: 2,
      pricing_mode: "manual",
      pool_fee: 9800.5,
    });
  });

  it("explains shared costs and shows two expected swimmers instead of twenty", async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/^Capacity/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Pricing method"), { target: { value: "cost_plus" } });
    expect(screen.getByLabelText(/^Expected attendees/)).toHaveValue(2);
    expect(screen.getByLabelText(/^Expected attendees/)).toHaveAttribute("max", "2");
    expect(screen.getByText(/actual turnout does not reprice paid bookings/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Load club rates" })).toBeInTheDocument()
    );
  });

  it.each(["included", "paid_extra"] as const)(
    "persists the explicit %s cohort billing mode without inferring it from pool cost",
    async (mode) => {
      const create = renderModal();
      fireEvent.change(screen.getByLabelText("Session Type"), {
        target: { value: "cohort_class" },
      });
      await screen.findByRole("option", { name: "September cohort" });
      fireEvent.change(screen.getByLabelText(/^Cohort/), { target: { value: "cohort-1" } });
      expect(screen.getByLabelText(/^Class payment/)).toHaveValue("included");
      fireEvent.change(screen.getByLabelText(/^Class payment/), { target: { value: mode } });
      fireEvent.change(
        screen.getByLabelText(
          mode === "included" ? /^Stored session rate/ : /^Booking price per attendee/
        ),
        { target: { value: "15000" } }
      );
      if (mode === "included")
        expect(screen.getByText(/Enrolled students pay ₦0 to book this class/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Create Session" }));
      await waitFor(() => expect(create).toHaveBeenCalledOnce());
      expect(create.mock.calls[0][0]).toMatchObject({
        session_type: "cohort_class",
        cohort_id: "cohort-1",
        cohort_fee_mode: mode,
        pool_fee: 15000,
      });
    }
  );

  it("keeps a paid extra practice separate from purchased-quarter inclusion", async () => {
    const onCreate = renderModal();
    fireEvent.change(screen.getByLabelText("Club access mode"), {
      target: { value: "paid_addon" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      club_id: "club-lagos",
      club_access_mode: "paid_addon",
    });
  });

  it("creates a general Club session with no pod", async () => {
    const onCreate = renderModal();

    expect(screen.getByRole("radio", { name: "General Club" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      club_id: "club-lagos",
      pod_id: null,
    });
  });

  it("requires and submits a pod for a pod-specific Club session", async () => {
    const onCreate = renderModal();

    fireEvent.click(screen.getByRole("radio", { name: "Pod-specific" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Orca pod" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      club_id: "club-lagos",
      pod_id: "pod-orca",
    });
  });

  it("submits volunteer opportunities during regular session creation", async () => {
    const onCreate = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Add test volunteer need" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][2]).toEqual([
      expect.objectContaining({ role_id: "role-checkin", role_title: "Check-in" }),
    ]);
  });

  it("submits the explicit Community drop-in toggle and rate", async () => {
    const onCreate = renderModal();
    fireEvent.click(screen.getByLabelText(/Allow Community drop-ins/i));
    fireEvent.change(screen.getAllByLabelText(/Community drop-in/i)[0], {
      target: { value: "6500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      allows_community_dropins: true,
      community_dropin_fee: 6500,
    });
  });
});
