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
          transitionRateNaira: "5000",
          transitionExpiresAt: "2026-12-31",
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText(/2026 per-session transition/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ approvedModes: ["quarterly_prepaid", "transition_per_session"] })
    );
  });

  it("shows a selector only when the application allows both modes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ClubPaymentModeSelector
        approvedModes={["transition_per_session"]}
        value="transition_per_session"
        transitionRateKobo={500000}
        transitionExpiresAt="2026-12-31"
        onChange={onChange}
      />
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("2026 per-session transition")).toBeInTheDocument();

    rerender(
      <ClubPaymentModeSelector
        approvedModes={["quarterly_prepaid", "transition_per_session"]}
        value="quarterly_prepaid"
        transitionRateKobo={500000}
        transitionExpiresAt="2026-12-31"
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("radio", { name: /2026 per-session transition/i }));
    expect(onChange).toHaveBeenCalledWith("transition_per_session");
    expect(screen.getByText(/₦5,000 per Club session/)).toBeInTheDocument();
  });

  it("shows the transition checkout rate, zero-quarterly message, and expiry", () => {
    render(
      <ClubTransitionCheckoutNotice
        sessionRateKobo={520000}
        expiresAt="2026-12-31"
      />
    );

    expect(screen.getByText(/No quarterly Club fee/)).toHaveTextContent(
      "Club sessions are ₦5,200 when booked"
    );
    expect(screen.getByText(/Transition ends/)).toHaveTextContent("31 Dec 2026");
  });
});
