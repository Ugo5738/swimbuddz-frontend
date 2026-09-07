import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { blankParticipant, ParticipantFields } from "./ParticipantFields";

describe("Named Experience participant details", () => {
  it("requires separate name, emergency contact and explicit safety consent", () => {
    const change = vi.fn(); render(<ParticipantFields title="Guest One" value={blankParticipant()} onChange={change} />);
    expect(screen.getByRole("group", {name: "Guest One"})).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeRequired();
    expect(screen.getByLabelText("Emergency contact phone")).toBeRequired();
    const consent = screen.getByRole("checkbox"); expect(consent).toBeRequired(); expect(consent).not.toBeChecked();
    fireEvent.click(consent); expect(change).toHaveBeenCalledWith(expect.objectContaining({waiver_accepted: true}));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});
