import GuestBooking from "@/app/(public)/guest-pass/session/[sessionId]/page";
import type { GuestPassOffer } from "@/lib/guestPasses";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  offer: {} as GuestPassOffer,
  create: vi.fn(),
  track: vi.fn(),
  query: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ sessionId: "swim-1" }),
  useSearchParams: () => mocks.query,
}));
vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: mocks.offer, loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock("@/hooks/useGuestCapability", () => ({
  useGuestCapability: () => ({ ready: true, token: "" }),
}));
vi.mock("@/lib/guestPasses", () => ({
  createGuestPass: mocks.create,
  trackGuestLink: mocks.track,
}));

beforeEach(() => {
  mocks.query = new URLSearchParams("source=instagram&campaign=swim-sept");
  mocks.create.mockReset().mockRejectedValue(new Error("Test checkout paused"));
  mocks.offer = {
    session_id: "swim-1",
    title: "Saturday Community Swim",
    starts_at: "2026-12-01T08:00:00Z",
    ends_at: "2026-12-01T10:00:00Z",
    timezone: "Africa/Lagos",
    location_name: null,
    guest_fee_kobo: 500000,
    currency: "NGN",
    community_dropin_fee_kobo: null,
    allows_guests: true,
    booking_mode: "reservation",
    guest_booking_mode: "public",
    spaces_remaining: 5,
    approval_granted: false,
    member_invitation_valid: false,
    booking_closes_at: null,
    reconciliation_closes_at: null,
    safety_acknowledgement_version: "pool-safety-2026-09",
  };
});
afterEach(cleanup);

describe("guest checkout lifecycle", () => {
  it("keeps transfer and safety acknowledgement separate from marketing consent", async () => {
    render(<GuestBooking />);
    expect(screen.getByText("Pool location shared after booking")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Bank transfer" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada Guest" } });
    fireEvent.change(screen.getByLabelText("Email", { exact: true }), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "08012345678" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Safety acknowledgement/ }));
    fireEvent.submit(screen.getByRole("button", { name: /Continue to pay/ }).closest("form")!);
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        "swim-1",
        expect.objectContaining({
          payment_method: "manual_transfer",
          waiver_accepted: true,
          marketing_consent: false,
          booking_source: "instagram",
          campaign_key: "swim-sept",
          referral_code: undefined,
        })
      )
    );
  });
  it("allows settlement at zero capacity without promising a held space", () => {
    mocks.offer.booking_mode = "settlement";
    mocks.offer.spaces_remaining = null;
    render(<GuestBooking />);
    expect(
      screen.getByRole("heading", { name: "Complete your guest booking" })
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bank transfer" })).toBeInTheDocument();
    expect(
      screen.getByText(/does not reserve a future space or mark you attended/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/held for 30 minutes/)).not.toBeInTheDocument();
  });
  it("requires an individual approval for Academy guest access", () => {
    mocks.offer.guest_booking_mode = "approval_required";
    render(<GuestBooking />);
    expect(screen.getByText(/This swim requires approval/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue to pay/ })).not.toBeInTheDocument();
  });
  it("confirms an explicit free guest rate without choosing a payment provider", () => {
    mocks.offer.guest_fee_kobo = 0;
    render(<GuestBooking />);
    expect(screen.getByRole("button", { name: "Confirm free guest booking" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
  it("does not allow a full future session to be booked", () => {
    mocks.offer.spaces_remaining = 0;
    render(<GuestBooking />);
    expect(screen.getByText(/This swim is full/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  });
  it("does not treat a reusable referral code as a member invitation", () => {
    mocks.query = new URLSearchParams("ref=UGO123");
    mocks.offer.guest_booking_mode = "member_invite";
    render(<GuestBooking />);
    expect(screen.getByText(/Ask the member who invited you/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  });
  it("accepts a verified session invitation independently of attribution", () => {
    mocks.offer.guest_booking_mode = "member_invite";
    mocks.offer.member_invitation_valid = true;
    render(<GuestBooking />);
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("fails closed when an older backend does not return guest admission policy", () => {
    mocks.offer.booking_mode = undefined as unknown as GuestPassOffer["booking_mode"];
    render(<GuestBooking />);
    expect(screen.getByText("Guest booking temporarily unavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
  });
});
