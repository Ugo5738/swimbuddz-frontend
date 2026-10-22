import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationFeedback } from "../NavigationFeedback";

const route = vi.hoisted(() => ({ pathname: "/account", query: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(route.query),
}));

function Fixture() {
  return <><NavigationFeedback /><a href="/account/bookings" onClick={(e) => e.preventDefault()}>My swims</a></>;
}

describe("navigation feedback lifecycle", () => {
  beforeEach(() => {
    route.pathname = "/account";
    route.query = "";
    window.history.replaceState({}, "", "/account");
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it("acknowledges a link click before any route data arrives", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByText("My swims"));
    expect(screen.getByRole("status", { name: "Opening page" })).toBeInTheDocument();
  });

  it("clears after pathname or query completion", () => {
    const { rerender } = render(<Fixture />);
    fireEvent.click(screen.getByText("My swims"));
    route.pathname = "/account/bookings";
    rerender(<Fixture />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("My swims"));
    route.query = "tab=history";
    rerender(<Fixture />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears failed navigation after the fallback timeout", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByText("My swims"));
    act(() => vi.advanceTimersByTime(15_000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears on browser history navigation and cancels timers on unmount", () => {
    const { unmount } = render(<Fixture />);
    fireEvent.click(screen.getByText("My swims"));
    fireEvent.popState(window);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("My swims"));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not acknowledge modified clicks", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByText("My swims"), { ctrlKey: true });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
