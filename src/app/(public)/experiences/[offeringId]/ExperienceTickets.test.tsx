import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExperienceTicketPage from "./page";

const mocks = vi.hoisted(() => ({get: vi.fn(), post: vi.fn(), put: vi.fn(), token: vi.fn(), quote: vi.fn()}));
vi.mock("next/navigation", () => ({useParams: () => ({offeringId: "q4"})}));
vi.mock("@/lib/api", () => ({apiGet: mocks.get, apiPost: mocks.post, apiPut: mocks.put}));
vi.mock("@/lib/auth", () => ({getCurrentAccessToken: mocks.token}));
vi.mock("@/lib/clubOnboarding", () => ({quoteCommunityExperience: mocks.quote}));
vi.mock("@/hooks/useApi", () => ({useApi: () => ({loading: false, error: null, data: {id: "q4", name: "December trip", max_guests_per_member: 2, ticket_options: [{kind: "public_guest", amount_kobo: 6_000_000}, {kind: "member_guest", amount_kobo: 5_500_000}], events: [{id: "event", title: "Weekend trip", start_time: "2026-12-05T09:00:00Z", end_time: "2026-12-06T17:00:00Z", location: null, location_area: "Lagos", is_location_private: true}]}})}));

describe("Experience ticket checkout", () => {
  beforeEach(() => {vi.clearAllMocks(); localStorage.clear(); mocks.token.mockResolvedValue(null); mocks.get.mockResolvedValue([]); mocks.post.mockResolvedValue({id: "order", status: "pending_payment", amount_kobo: 6_000_000, membership_fee_kobo: 0, expires_at: "2099-12-05T09:30:00Z", payment_reference: "EXPERIENCE-ONE", tickets: [{id: "ticket", full_name: "Visitor Test", ticket_kind: "public_guest", price_kobo: 6_000_000}], events: []});});
  it("reserves a public guest at server price without annual Membership or client totals", async () => {
    render(<ExperienceTicketPage />); await screen.findByText("December trip");
    const fields: Record<string, string> = {"Full name": "Visitor Test", Email: "visitor@example.com", Phone: "08012345678", "Emergency contact name": "Contact", "Emergency contact phone": "08098765432"};
    Object.entries(fields).forEach(([name, value]) => fireEvent.change(screen.getByLabelText(name), {target: {value}})); fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", {name: "Reserve and review exact price"}));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const payload = mocks.post.mock.calls[0][1]; expect(payload.participant.full_name).toBe("Visitor Test"); expect(payload.participant.waiver_accepted).toBe(true); expect(payload).not.toHaveProperty("amount_kobo"); expect(payload.guests).toEqual([]);
    expect(await screen.findByText(/Subtotal: ₦60,000/)).toBeInTheDocument(); expect(screen.queryByText(/^Annual SwimBuddz Membership:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Review payment charges"})).toBeInTheDocument();
  });
  it("restores a paid ticket rather than prompting for another payment", async () => {
    localStorage.setItem("swimbuddz:experience:q4", JSON.stringify({idempotency_key: "key", access_token: "secret", order_id: "order"}));
    mocks.post.mockResolvedValue({id: "order", status: "confirmed", amount_kobo: 6_000_000, membership_fee_kobo: 0, expires_at: "2026-12-05T09:30:00Z", payment_reference: "EXPERIENCE-ONE", tickets: [{id: "ticket", full_name: "Visitor Test", ticket_kind: "public_guest", price_kobo: 6_000_000}], events: []});
    render(<ExperienceTicketPage />); expect(await screen.findByText("Confirmed tickets")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Reserve and review exact price"})).not.toBeInTheDocument();
  });
});
