import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProductDetailPage from "../page";
import { apiGet } from "@/lib/api";

const mocks = vi.hoisted(() => ({ addItem: vi.fn(), error: vi.fn(), router: { push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useParams: () => ({ slug: "starter-kit" }), useRouter: () => mocks.router }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));
vi.mock("@/lib/storeCart", () => ({ useStoreCart: () => ({ addItem: mocks.addItem, itemCount: 0, isAuthenticated: false }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn() } }));
const variant = (id: string, options = {}) => ({ id, sku: id, name: id, options, is_active: true, price_override_ngn: null, quantity_available: 0 });
const product = (variants: ReturnType<typeof variant>[], extras = {}) => ({
  id: "kit", name: "Starter Kit", slug: "starter-kit", base_price_ngn: 70000,
  status: "active", sourcing_type: "preorder", preorder_lead_days: 21,
  variant_options: null, images: [], videos: [], variants, ...extras,
});

beforeEach(() => { vi.clearAllMocks(); mocks.addItem.mockResolvedValue(undefined); });
describe("preorder product selection", () => {
  it.each([390, 1440])("adds a simple zero-stock preorder at viewport %s", async (width) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    vi.mocked(apiGet).mockResolvedValue(product([variant("default")]));
    render(<ProductDetailPage />);
    const preorder = await screen.findByRole("button", { name: width < 1024 ? "Pre-order" : "Pre-order Now" });
    expect(preorder).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(preorder);
    await waitFor(() => expect(mocks.addItem).toHaveBeenCalledWith("default", 2));
    expect(mocks.error).not.toHaveBeenCalled();
  });
  it("clearly disables ordering when no purchasable SKU exists", async () => {
    vi.mocked(apiGet).mockResolvedValue(product([]));
    render(<ProductDetailPage />);
    expect(await screen.findByRole("button", { name: "Temporarily unavailable" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("temporarily unavailable for ordering");
    expect(mocks.addItem).not.toHaveBeenCalled();
  });
  it("derives visible choices from SKU data and clears an invalid combination", async () => {
    vi.mocked(apiGet).mockResolvedValue(product([
      variant("small-red", { Size: "S", Color: "Red" }),
      variant("large-blue", { Size: "L", Color: "Blue" }),
    ]));
    render(<ProductDetailPage />);
    fireEvent.click(await screen.findByRole("button", { name: "S" }));
    fireEvent.click(screen.getByRole("button", { name: "Red" }));
    expect(screen.getByRole("button", { name: "Pre-order Now" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "L" }));
    expect(screen.getByRole("button", { name: "Pre-order Now" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Blue" }));
    fireEvent.click(screen.getByRole("button", { name: "Pre-order Now" }));
    await waitFor(() => expect(mocks.addItem).toHaveBeenCalledWith("large-blue", 1));
  });
  it("requires an explicit choice for multiple unnamed option sets", async () => {
    vi.mocked(apiGet).mockResolvedValue(product([variant("kit-a"), variant("kit-b")]));
    render(<ProductDetailPage />);
    const chooser = await screen.findByRole("combobox", { name: "Product option" });
    expect(screen.getByRole("button", { name: "Pre-order Now" })).toBeDisabled();
    fireEvent.change(chooser, { target: { value: "kit-b" } });
    fireEvent.click(screen.getByRole("button", { name: "Pre-order Now" }));
    await waitFor(() => expect(mocks.addItem).toHaveBeenCalledWith("kit-b", 1));
  });
  it("honors the public stock field for stocked products", async () => {
    vi.mocked(apiGet).mockResolvedValue(product([variant("default")], { sourcing_type: "stocked" }));
    render(<ProductDetailPage />);
    for (const button of await screen.findAllByRole("button", { name: "Add to Cart" })) expect(button).toBeDisabled();
  });
});
