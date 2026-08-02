import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClubStandardsAcknowledgement } from "../ClubStandardsAcknowledgement";

describe("ClubStandardsAcknowledgement", () => {
  it("links to the standards and reports acceptance changes", () => {
    const onChange = vi.fn();
    render(<ClubStandardsAcknowledgement checked={false} onChange={onChange} />);

    const link = screen.getByRole("link", { name: /read the club standards/i });
    expect(link).toHaveAttribute("href", "/club/standards");

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /i have read and agree to follow the swimbuddz club standards/i,
      })
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
