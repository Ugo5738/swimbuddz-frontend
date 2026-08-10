import { describe, expect, it } from "vitest";

import {
  DEFAULT_MEDIA_VAULT_CHECKLIST,
  accessWindowForRole,
} from "@/lib/media-vault";

describe("media vault access windows", () => {
  const pastVault = {
    upload_opens_at: "2026-08-01T04:00:00.000Z",
    upload_closes_at: "2026-08-02T11:00:00.000Z",
  };
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("reopens an expired contributor window for seven days", () => {
    const window = accessWindowForRole(pastVault, "contributor", now);

    expect(window.startsAt).toBe("2026-08-01T04:00:00.000Z");
    expect(window.expiresAt).toBe("2026-08-17T12:00:00.000Z");
  });

  it("keeps curator review access for thirty days after upload closes", () => {
    const window = accessWindowForRole(pastVault, "curator", now);

    expect(window.startsAt).toBe("2026-08-01T04:00:00.000Z");
    expect(window.expiresAt).toBe("2026-09-01T11:00:00.000Z");
  });

  it("ships the session-day minimum coverage checklist", () => {
    expect(DEFAULT_MEDIA_VAULT_CHECKLIST).toContain(
      "One uninterrupted complete-length swim"
    );
    expect(DEFAULT_MEDIA_VAULT_CHECKLIST).toHaveLength(10);
  });
});
