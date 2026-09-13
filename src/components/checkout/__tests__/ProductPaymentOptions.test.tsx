import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductPaymentOptions } from "../ProductPaymentOptions";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get }));

describe("Product payment options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ balance: 1000, available_balance: 80 });
  });
  it("hides controls for zero-due transition enrollment", () => {
    render(<ProductPaymentOptions quote={{ subtotal_kobo: 0 }} value={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
  it("caps Bubbles by available balance and discounted net price, excluding fees", async () => {
    const onChange = vi.fn();
    render(
      <ProductPaymentOptions
        quote={{ subtotal_kobo: 2000000, net_subtotal_kobo: 500000 }}
        value={{}}
        onChange={onChange}
      />
    );
    const slider = await screen.findByRole("slider");
    expect(slider).toHaveAttribute("max", "50");
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    expect(onChange).toHaveBeenCalledWith({ bubbles_to_apply: 50 });
  });
  it("does not offer wallet tender to a public guest or bank transfer", async () => {
    const { rerender } = render(
      <ProductPaymentOptions
        quote={{ subtotal_kobo: 2000000 }}
        value={{}}
        member={false}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
    rerender(
      <ProductPaymentOptions
        quote={{ subtotal_kobo: 2000000 }}
        value={{}}
        online={false}
        onChange={vi.fn()}
      />
    );
    expect(await screen.findByText(/Bank transfers cannot be combined/)).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
  it("resets Bubbles when applying or removing a code", () => {
    const onChange = vi.fn();
    render(
      <ProductPaymentOptions
        quote={{ subtotal_kobo: 2000000 }}
        value={{ bubbles_to_apply: 10 }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Have a discount code?" }));
    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: " member10 " } });
    fireEvent.click(screen.getByRole("button", { name: "Apply code" }));
    expect(onChange).toHaveBeenCalledWith({ discount_code: "MEMBER10", bubbles_to_apply: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Remove code" }));
    expect(onChange).toHaveBeenLastCalledWith({ bubbles_to_apply: 0 });
  });
});
