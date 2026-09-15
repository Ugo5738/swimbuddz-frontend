import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { apiGet } from "@/lib/api";
import { PaymentProofLink } from "../PaymentProofLink";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
});

it("resolves an uploaded receipt by media ID only after the admin requests it", async () => {
  vi.mocked(apiGet).mockResolvedValue({ file_url: "https://storage.example/receipt?signed=1" });
  render(<PaymentProofLink mediaId="receipt-id" />);
  expect(apiGet).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "View receipt" }));
  expect(await screen.findByRole("link", { name: "Open uploaded receipt" })).toHaveAttribute(
    "href",
    "https://storage.example/receipt?signed=1"
  );
  expect(apiGet).toHaveBeenCalledWith(
    "/api/v1/media/media/receipt-id",
    expect.objectContaining({ auth: true })
  );
});

it("offers retry when receipt resolution fails", async () => {
  vi.mocked(apiGet)
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValueOnce({ file_url: "https://storage.example/receipt" });
  render(<PaymentProofLink mediaId="receipt-id" />);
  fireEvent.click(screen.getByRole("button", { name: "View receipt" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry loading receipt" }));
  expect(await screen.findByRole("link", { name: "Open uploaded receipt" })).toBeInTheDocument();
});

it("does not falsely claim an attached receipt is missing just because no URL was supplied", () => {
  render(<PaymentProofLink mediaId="receipt-id" />);
  expect(screen.queryByText(/No receipt attached/)).not.toBeInTheDocument();
});
