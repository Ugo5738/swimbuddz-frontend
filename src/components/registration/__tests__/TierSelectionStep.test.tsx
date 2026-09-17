import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TierSelectionStep } from "../TierSelectionStep";

describe("starting path cards", () => {
  it("exposes each complete card as an accessible selectable button", () => {
    const select = vi.fn();
    render(<TierSelectionStep selectedTier="club" onSelectTier={select} />);
    expect(screen.getByRole("button", { name: "Join Club" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Learn through Academy" }));
    expect(select).toHaveBeenCalledWith("academy");
    expect(screen.getByText("By programme")).toBeInTheDocument();
    expect(screen.getByText("per cohort")).toBeInTheDocument();
    expect(document.querySelector("button button")).toBeNull();
  });
  it("does not select a disabled path", () => {
    const select = vi.fn();
    render(
      <TierSelectionStep selectedTier={null} onSelectTier={select} disabledTier="community" />
    );
    fireEvent.click(screen.getByRole("button", { name: "SwimBuddz Membership" }));
    expect(select).not.toHaveBeenCalled();
  });
});
