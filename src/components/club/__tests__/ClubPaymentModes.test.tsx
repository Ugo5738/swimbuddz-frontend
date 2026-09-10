import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClubPaymentArrangementFields } from "../ClubPaymentArrangementFields";
import { ClubPaymentModeSelector } from "../ClubPaymentModeSelector";
import { ClubTransitionCheckoutNotice } from "../ClubTransitionCheckoutNotice";

describe("Club payment arrangement controls", () => {
  it("lets an admin explicitly approve both modes and configure transition terms", () => {
    const onChange = vi.fn();
    render(
      <ClubPaymentArrangementFields
        value={{
          approvedModes: ["quarterly_prepaid"],
          transitionExpiresAt: "2026-12-31",
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText(/Pay per swim/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ approvedModes: ["quarterly_prepaid", "transition_per_session"] })
    );
    expect(screen.queryByLabelText(/transition session rate/i)).not.toBeInTheDocument();
  });

  it("shows a selector only when the application allows both modes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ClubPaymentModeSelector
        approvedModes={["transition_per_session"]}
        value="transition_per_session"
        transitionExpiresAt="2026-12-31"
        onChange={onChange}
      />
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("Pay per swim")).toBeInTheDocument();

    rerender(
      <ClubPaymentModeSelector
        approvedModes={["quarterly_prepaid", "transition_per_session"]}
        value="quarterly_prepaid"
        transitionExpiresAt="2026-12-31"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("radio", { name: /Pay per swim/i }));
    expect(onChange).toHaveBeenCalledWith("transition_per_session");
    expect(screen.getByText(/price shown for each swim when you book/)).toBeInTheDocument();
  });

  it("shows session-owned pricing, zero-quarterly message, and expiry", () => {
    render(<ClubTransitionCheckoutNotice expiresAt="2026-12-31" />);

    expect(screen.getByText(/no quarterly Club fee/)).toHaveTextContent(
      "You'll pay the price shown for each swim when you book."
    );
    expect(screen.getByText(/Pay per swim until/)).toHaveTextContent("31 Dec 2026");
  });
});
