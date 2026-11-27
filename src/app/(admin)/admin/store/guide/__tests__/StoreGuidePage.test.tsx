import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StoreOperationsGuidePage from "../page";

describe("StoreOperationsGuidePage (/admin/store/guide)", () => {
  it("renders all five day-one playbook sections and verified admin screen links", () => {
    render(<StoreOperationsGuidePage />);

    expect(
      screen.getByRole("heading", { name: "Store Operations Guide", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1. Where Everything Lives" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2. What to Do Before & After a Purchase" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "3. When Does Stock Actually Get Deducted?" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "4. Payments, Cancellations, Returns & Refunds" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "5. If You See This Error, Do This" })
    ).toBeInTheDocument();

    const expectedRoutes = [
      "/admin/store",
      "/admin/store/products",
      "/admin/store/procurement",
      "/admin/store/inventory",
      "/admin/payments",
      "/admin/store/orders",
      "/admin/store/cases",
      "/admin/payments?tab=refunds",
    ];
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter(Boolean);

    for (const route of expectedRoutes) {
      expect(hrefs).toContain(route);
    }
  });

  it("switches interactive before/after playbooks across Stocked, Preorder / Backorder, and Dropship", () => {
    render(<StoreOperationsGuidePage />);

    const stockedTab = screen.getByRole("tab", { name: "Stocked" });
    const preorderTab = screen.getByRole("tab", { name: "Preorder / Backorder" });
    const dropshipTab = screen.getByRole("tab", { name: "Dropship" });

    // Default tab is Stocked
    expect(stockedTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Stocked Workflow")).toBeInTheDocument();
    expect(screen.getByText(/Complete handover \(stock deducts here!\)/i)).toBeInTheDocument();

    // Switch to Preorder / Backorder
    fireEvent.click(preorderTab);
    expect(preorderTab).toHaveAttribute("aria-selected", "true");
    expect(stockedTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Preorder / Backorder Workflow")).toBeInTheDocument();
    expect(screen.getByText(/Strict Option A rule:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Receive the batch when it lands \(FIFO auto-reserves!\)/i)
    ).toBeInTheDocument();

    // Switch to Dropship
    fireEvent.click(dropshipTab);
    expect(dropshipTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Dropship Workflow")).toBeInTheDocument();
    expect(
      screen.getByText(/Supplier ships directly to the customer/i)
    ).toBeInTheDocument();
  });

  it("displays the three storefront variant states legend", () => {
    render(<StoreOperationsGuidePage />);

    expect(screen.getByText(/In Stock \(qty > 0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Pre-order \(qty 0 \+ backorder ON\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Out of Stock \(qty 0 \+ backorder OFF\)/i)).toBeInTheDocument();
  });
});
