import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { PaymentChoicePanel } from "../PaymentChoicePanel";

describe("PaymentChoicePanel", () => {
  const baseProps = {
    amountKobo: 5_000_000, // ₦50,000
    enrollmentId: "enr-1",
    installmentId: "inst-1",
    onPayWithCard: vi.fn(),
  };

  it("calls onPayWithCard with the stipulated amount when 'Pay' is clicked", () => {
    const onPayWithCard = vi.fn();
    render(<PaymentChoicePanel {...baseProps} onPayWithCard={onPayWithCard} />);

    const payButton = screen.getByRole("button", { name: /Pay ₦50,000/ });
    fireEvent.click(payButton);

    expect(onPayWithCard).toHaveBeenCalledTimes(1);
    expect(onPayWithCard).toHaveBeenCalledWith(5_000_000);
  });

  it("hides the 'Pay a different amount' link when maxPayableKobo is missing", () => {
    render(<PaymentChoicePanel {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: /Pay a different amount/ }),
    ).not.toBeInTheDocument();
  });

  it("hides the 'Pay a different amount' link when maxPayableKobo equals next installment", () => {
    render(
      <PaymentChoicePanel {...baseProps} maxPayableKobo={5_000_000} />,
    );
    expect(
      screen.queryByRole("button", { name: /Pay a different amount/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Pay a different amount' link when there's a future installment to roll into", () => {
    render(
      <PaymentChoicePanel {...baseProps} maxPayableKobo={15_000_000} />,
    );
    expect(
      screen.getByRole("button", { name: /Pay a different amount/ }),
    ).toBeInTheDocument();
  });

  it("validates: amounts below the next installment show an error and disable submit", () => {
    const onPayWithCard = vi.fn();
    render(
      <PaymentChoicePanel
        {...baseProps}
        onPayWithCard={onPayWithCard}
        maxPayableKobo={15_000_000}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Pay a different amount/ }),
    );

    const input = screen.getByDisplayValue("50000") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "30000" } }); // ₦30k < min ₦50k

    expect(
      screen.getByText(/Minimum is ₦50,000/),
    ).toBeInTheDocument();

    // The custom Pay button (next to the input) should be disabled
    const customPayButton = screen.getByRole("button", { name: /Pay ₦30,000/ });
    expect(customPayButton).toBeDisabled();
  });

  it("validates: amounts above the remaining balance show an error", () => {
    render(
      <PaymentChoicePanel
        {...baseProps}
        maxPayableKobo={15_000_000}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Pay a different amount/ }),
    );
    const input = screen.getByDisplayValue("50000") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "200000" } }); // exceeds 150k max

    expect(
      screen.getByText(/Maximum is ₦150,000/),
    ).toBeInTheDocument();
  });

  it("calls onPayWithCard with the custom amount when valid", () => {
    const onPayWithCard = vi.fn();
    render(
      <PaymentChoicePanel
        {...baseProps}
        onPayWithCard={onPayWithCard}
        maxPayableKobo={15_000_000}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Pay a different amount/ }),
    );
    const input = screen.getByDisplayValue("50000") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "87500" } });

    const customPayButton = screen.getByRole("button", { name: /Pay ₦87,500/ });
    expect(customPayButton).toBeEnabled();
    fireEvent.click(customPayButton);

    expect(onPayWithCard).toHaveBeenCalledWith(8_750_000);
  });
});
