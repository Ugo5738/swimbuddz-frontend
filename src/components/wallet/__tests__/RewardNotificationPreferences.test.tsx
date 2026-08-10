import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RewardNotificationPreferences } from "../RewardNotificationPreferences";

const apiGet = vi.fn();
const apiPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
}));

describe("RewardNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue({
      notify_on_reward: true,
      notify_on_referral_qualified: true,
      notify_on_ambassador_milestone: true,
      notify_on_streak_milestone: true,
      notify_channel: "in_app",
    });
    apiPatch.mockResolvedValue({});
  });

  it("uses the backend reward preference field names when saving", async () => {
    render(<RewardNotificationPreferences />);

    const rewardToggle = await screen.findByRole("switch", { name: "Reward Earned" });
    fireEvent.click(rewardToggle);

    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/v1/wallet/notifications/preferences",
        { notify_on_reward: false },
        { auth: true }
      )
    );
  });
});
