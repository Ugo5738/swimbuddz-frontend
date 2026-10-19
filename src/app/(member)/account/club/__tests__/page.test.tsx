import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useApi } from "@/hooks/useApi";
import Page from "../page";

vi.mock("@/hooks/useApi", () => ({ useApi: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiPost: vi.fn() }));

it("shows bookable pay-per-swim Club sessions without a prepaid reservation", () => {
  vi.mocked(useApi).mockImplementation((path) => ({ loading: false, error: null, refetch: vi.fn(),
    data: String(path).includes("club-quarter") ? [] : [
      { id: "yaba", title: "Yaba general Club practice", starts_at: "2026-10-24T08:00:00Z", location_name: "Rowe Park", pool_fee: 5200,
        access: { bookable: true, fee_amount_kobo: 520000, price_label: "Transition session rate" } },
      { id: "private-pod", title: "Another pod", access: { bookable: false } },
    ],
  } as never));
  render(<Page />);
  expect(screen.getByText("Yaba general Club practice")).toBeInTheDocument();
  expect(screen.getByText(/Transition session rate · ₦5,200/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Book swim" })).toHaveAttribute("href", "/sessions/yaba/book");
  expect(screen.queryByText("Another pod")).not.toBeInTheDocument();
});
