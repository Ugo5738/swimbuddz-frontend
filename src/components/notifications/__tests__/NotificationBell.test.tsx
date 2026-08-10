import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell } from "../NotificationBell";

const apiGet = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: vi.fn(),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation((path: string) => {
      if (path.includes("announcements")) {
        return Promise.reject(new Error("announcements unavailable"));
      }
      if (path.includes("unread-count")) {
        return Promise.resolve({ unread_count: 1 });
      }
      if (path.includes("/notifications/?")) {
        return Promise.resolve({
          items: [
            {
              id: "notification-1",
              type: "media_vault_access_granted",
              category: "media",
              title: "Media vault assignment: Saturday Club Swim",
              body: "You can upload full-quality originals.",
              action_url: "/account/media-vault/vault-1",
              read_at: null,
              created_at: "2026-08-10T12:00:00.000Z",
            },
          ],
          total: 1,
          unread_count: 1,
        });
      }
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });
  });

  it("still shows personal media alerts when announcements are unavailable", async () => {
    render(<NotificationBell memberId="member-1" pollInterval={0} />);

    const button = await screen.findByRole("button", {
      name: "Notifications (1 unread)",
    });
    fireEvent.click(button);

    await waitFor(() =>
      expect(
        screen.getByText("Media vault assignment: Saturday Club Swim")
      ).toBeInTheDocument()
    );
  });
});
