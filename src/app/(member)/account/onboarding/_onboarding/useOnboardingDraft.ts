"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import type { Member, OnboardingDraft, StepKey } from "../types";
import { getDraftKey, ONBOARDING_DRAFT_VERSION } from "../utils";

type PersistedForms = Omit<OnboardingDraft, "version" | "updatedAt" | "currentStep">;

// The page's coreForm state carries `profilePhotoMediaId` in addition to the
// draft-persisted fields. The hook accepts the wider shape and projects to
// the persisted shape when building the snapshot.
type LiveCoreForm = PersistedForms["coreForm"] & { profilePhotoMediaId: string };

type Params = {
  member: Member | null;
  currentStep: StepKey;
  // Form state — used to build the persisted snapshot. The hook does not own
  // these; the page does. Hook just observes for debounced persistence.
  coreForm: LiveCoreForm;
  clubForm: PersistedForms["clubForm"];
  clubReadinessForm: PersistedForms["clubReadinessForm"];
  swimForm: PersistedForms["swimForm"];
  academyForm: PersistedForms["academyForm"];
  signalsForm: PersistedForms["signalsForm"];
  // Set to true once the page has resolved its initial step (from URL,
  // restored draft, or first-incomplete). Until then, suppress saves so
  // the initial render doesn't clobber an existing draft.
  initialized: boolean;
};

type Result = {
  draftKey: string | null;
  clearDraft: () => void;
};

/**
 * Persists the current onboarding form state to localStorage with a 250ms
 * debounce. Restoration on mount is the page's responsibility — it needs
 * access to setCoreForm/etc setters and the `firstIncompleteStep` derivation,
 * which is too coupled to the page's memoized state to live in a hook.
 */
export function useOnboardingDraft({
  member,
  currentStep,
  coreForm,
  clubForm,
  clubReadinessForm,
  swimForm,
  academyForm,
  signalsForm,
  initialized,
}: Params): Result {
  const draftKey = useMemo(
    () => (member ? getDraftKey(member) : null),
    [member?.id, member?.email],
  );

  const draftSaveTimer = useRef<number | null>(null);

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    if (!initialized) return;

    if (draftSaveTimer.current) {
      window.clearTimeout(draftSaveTimer.current);
    }

    draftSaveTimer.current = window.setTimeout(() => {
      const profilePhotoUrlToPersist =
        coreForm.profilePhotoUrl && !coreForm.profilePhotoUrl.startsWith("data:")
          ? coreForm.profilePhotoUrl
          : "";

      // Strip page-only fields (profilePhotoMediaId) from the persisted snapshot.
      const { profilePhotoMediaId: _ignored, ...persistedCore } = coreForm;
      void _ignored;
      const draft: OnboardingDraft = {
        version: ONBOARDING_DRAFT_VERSION,
        updatedAt: Date.now(),
        currentStep,
        coreForm: { ...persistedCore, profilePhotoUrl: profilePhotoUrlToPersist },
        clubForm,
        clubReadinessForm,
        swimForm,
        academyForm,
        signalsForm,
      };

      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        // ignore (e.g., quota exceeded)
      }
    }, 250);

    return () => {
      if (draftSaveTimer.current) window.clearTimeout(draftSaveTimer.current);
    };
  }, [
    academyForm,
    clubForm,
    clubReadinessForm,
    coreForm,
    currentStep,
    draftKey,
    initialized,
    signalsForm,
    swimForm,
  ]);

  return { draftKey, clearDraft };
}
