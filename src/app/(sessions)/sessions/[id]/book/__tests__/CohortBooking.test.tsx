import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { apiGet, apiPost } from "@/lib/api";
import { getSession, SessionStatus, SessionType, type Session } from "@/lib/sessions";
import { toast } from "sonner";
import SessionBookPage from "../page";

const state = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.query),
  notFound: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentAccessToken: vi.fn(async () => "test-token") }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/lib/sessions", async (original) => ({
  ...(await original<typeof import("@/lib/sessions")>()),
  getSession: vi.fn(),
}));
vi.mock("@/components/volunteer/SessionVolunteerPanel", () => ({
  SessionVolunteerPanel: () => null,
}));
vi.mock("../_components/BookingSessionHeader", () => ({
  BookingSessionHeader: () => <h1>Extra cohort class</h1>,
}));
vi.mock("../_components/BookingSuccess", () => ({
  BookingSuccess: () => <div>Verified booking success</div>,
}));
vi.mock("../_components/BookingError", () => ({
  BookingError: ({ errorMessage }: { errorMessage: string }) => (
    <div role="alert">{errorMessage}</div>
  ),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function session(fee = 1500000): Session {
  return {
    id: "session-1",
    title: "Extra cohort class",
    session_type: SessionType.COHORT_CLASS,
    cohort_id: "cohort-1",
    cohort_fee_mode: fee ? "paid_extra" : "included",
    status: SessionStatus.SCHEDULED,
    starts_at: "2030-09-13T16:00:00Z",
    ends_at: "2030-09-13T17:00:00Z",
    capacity: 2,
    pool_fee: 15000,
    ride_share_fee: 0,
    allows_guests: false,
    access: {
      bookable: true,
      visible: true,
      required_tier: "academy",
      fee_amount_kobo: fee,
      access_source: "cohort_enrollment",
      price_label: fee ? "Extra cohort class" : "Included in Academy tuition",
    },
  } as Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.query = "";
  vi.mocked(getSession).mockResolvedValue(session());
  vi.mocked(apiGet).mockImplementation(async (path) => {
    if (path === "/api/v1/members/me")
      return {
        id: "member-1",
        email: "learner@example.com",
        membership: { academy_paid_until: "2031-01-01T00:00:00Z" },
      };
    if (path === "/api/v1/wallet/me") return { balance: 20, status: "active" };
    return [];
  });
});

it("an extra-class link uses normal checkout with a pending booking, discount and Bubbles", async () => {
  vi.mocked(apiPost).mockImplementation(async (path) => {
    if (path.endsWith("/discounts/preview"))
      return {
        valid: true,
        code: "PRACTICE",
        discount_type: "fixed",
        discount_value: 1000,
        discount_amount: 1000,
      };
    if (path.endsWith("/book"))
      return { id: "booking-1", status: "pending", fee_amount_kobo: 1500000 };
    return { reference: "PAY-TEST", status: "pending", checkout_url: null };
  });
  render(<SessionBookPage params={{ id: "session-1" }} />);
  await screen.findByText("Extra cohort class");
  fireEvent.click(screen.getAllByRole("button", { name: "Have a discount code?" })[0]);
  fireEvent.change(screen.getByPlaceholderText("Discount code"), { target: { value: "PRACTICE" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  await waitFor(() => expect(screen.getAllByText("PRACTICE").length).toBeGreaterThan(0));
  fireEvent.change(screen.getByRole("slider"), { target: { value: "10" } });
  fireEvent.click(screen.getAllByRole("button", { name: /Pay.*13,000.*10/ })[0]);
  await waitFor(() =>
    expect(apiPost).toHaveBeenCalledWith(
      "/api/v1/payments/intents",
      expect.objectContaining({
        purpose: "session_booking",
        session_id: "session-1",
        direct_amount: 15000,
        discount_code: "PRACTICE",
        bubbles_to_apply: 10,
        payment_metadata: { booking_id: "booking-1" },
      }),
      { auth: true }
    )
  );
  expect(screen.queryByText("Verified booking success")).not.toBeInTheDocument();
});

it("an included regular class with a stored ₦15k rate confirms without a second payment", async () => {
  vi.mocked(getSession).mockResolvedValue(session(0));
  vi.mocked(apiPost).mockResolvedValue({ id: "booking-1", status: "confirmed" });
  render(<SessionBookPage params={{ id: "session-1" }} />);
  await screen.findByText("Extra cohort class");
  fireEvent.click(screen.getAllByRole("button", { name: "Confirm Booking" })[0]);
  expect(await screen.findByText("Verified booking success")).toBeInTheDocument();
  expect(apiPost).toHaveBeenCalledOnce();
  expect(apiPost).toHaveBeenCalledWith(
    "/api/v1/sessions/session-1/book",
    expect.objectContaining({ fee_amount_kobo: 0, pay_with_bubbles: false }),
    { auth: true }
  );
});

it("never shows a pending booking as confirmed after a stale free-price response", async () => {
  vi.mocked(getSession).mockResolvedValue(session(0));
  vi.mocked(apiPost).mockResolvedValue({ id: "booking-1", status: "pending" });
  render(<SessionBookPage params={{ id: "session-1" }} />);
  await screen.findByText("Extra cohort class");
  fireEvent.click(screen.getAllByRole("button", { name: "Confirm Booking" })[0]);
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("not confirmed yet"))
  );
  expect(screen.queryByText("Verified booking success")).not.toBeInTheDocument();
});

it.each([true, false])(
  "Paystack return only shows success when payment and booking fulfillment are verified (%s)",
  async (fulfilled) => {
    state.query = "reference=PAY-VERIFIED";
    vi.mocked(apiPost).mockResolvedValue({
      status: "paid",
      entitlement_applied_at: fulfilled ? "2030-09-12T12:00:00Z" : null,
      entitlement_error: null,
    });
    render(<SessionBookPage params={{ id: "session-1" }} />);
    if (fulfilled) expect(await screen.findByText("Verified booking success")).toBeInTheDocument();
    else {
      expect(await screen.findByRole("alert")).toHaveTextContent("Payment is still processing");
      expect(screen.queryByText("Verified booking success")).not.toBeInTheDocument();
    }
    expect(apiPost).toHaveBeenCalledWith(
      "/api/v1/payments/paystack/verify/PAY-VERIFIED",
      {},
      { auth: true }
    );
  }
);
