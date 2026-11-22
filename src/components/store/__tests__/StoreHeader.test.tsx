import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreHeader } from "../StoreHeader";

const mocks = vi.hoisted(() => ({
  pathname: "/store",
  router: { push: vi.fn() },
  itemCount: 0,
  isAuthenticated: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => mocks.pathname,
}));

vi.mock("@/lib/storeCart", () => ({
  useStoreCart: () => ({
    itemCount: mocks.itemCount,
    isAuthenticated: mocks.isAuthenticated,
  }),
}));

describe("StoreHeader navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links back to SwimBuddz homepage when at the root store catalog (/store)", () => {
    mocks.pathname = "/store";
    render(<StoreHeader />);

    const homeLink = screen.getByTitle("Back to SwimBuddz Home");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("links back to Store catalog (/store) when inside a product or cart page", () => {
    mocks.pathname = "/store/product/full-coverage-2-piece-swim-set";
    render(<StoreHeader />);

    const storeLink = screen.getByTitle("Back to Store Catalog");
    expect(storeLink).toHaveAttribute("href", "/store");
    expect(screen.queryByTitle("Back to SwimBuddz Home")).not.toBeInTheDocument();
  });

  it("retains the current store page in login redirect query parameter", () => {
    mocks.pathname = "/store/cart";
    render(<StoreHeader />);

    const loginLink = screen.getByRole("link", { name: "Login" });
    expect(loginLink).toHaveAttribute(
      "href",
      "/login?redirect=%2Fstore%2Fcart"
    );
  });
});
