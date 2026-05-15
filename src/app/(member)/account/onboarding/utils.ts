// Helpers extracted from page.tsx during the file-size sweep.

import type { Member, OnboardingDraft } from "./types";

export const ONBOARDING_DRAFT_VERSION = 2;

export function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const ms = Date.parse(String(value));
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().split("T")[0] || "";
}

export function getDraftKey(member: Member) {
  const id = member.id ? String(member.id) : "";
  const email = member.email ? String(member.email) : "";
  const suffix = id || email || "me";
  return `swimbuddz:onboarding:draft:v${ONBOARDING_DRAFT_VERSION}:${suffix}`;
}

export function safeParseDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (parsed.version !== ONBOARDING_DRAFT_VERSION) return null;
    if (!parsed.currentStep) return null;
    return parsed as OnboardingDraft;
  } catch {
    return null;
  }
}
