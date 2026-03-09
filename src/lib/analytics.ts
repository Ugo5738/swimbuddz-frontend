/**
 * Google Analytics 4 helpers.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("assessment_completed", { level: "intermediate", score: 72 });
 *
 * The GA measurement ID is read from NEXT_PUBLIC_GA_ID.
 * If the env var is missing, all calls are silently ignored — safe for
 * local dev and preview environments.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/** Whether GA is configured for this environment. */
export const isGAEnabled = (): boolean => GA_ID.length > 0;

/** Send a custom GA4 event with optional parameters. */
export function trackEvent(action: string, params?: Record<string, string | number | boolean>) {
  if (!isGAEnabled()) return;
  window.gtag?.("event", action, params);
}

/** Manually send a page_view (App Router route changes). */
export function trackPageView(url: string) {
  if (!isGAEnabled()) return;
  window.gtag?.("config", GA_ID, { page_path: url });
}

// ──────────────────────────────────────────────
// Pre-defined event helpers for key conversions
// ──────────────────────────────────────────────

/** User lands on the assessment landing page. */
export function trackAssessmentStarted() {
  trackEvent("assessment_started");
}

/** User completes the quiz and receives results. */
export function trackAssessmentCompleted(params: { score: number; level: string }) {
  trackEvent("assessment_completed", params);
}

/** User clicks a share button on the results page. */
export function trackAssessmentShared(platform: string) {
  trackEvent("assessment_shared", { platform });
}

/** User clicks a CTA from the results page. */
export function trackAssessmentCTA(params: { level: string; destination: string }) {
  trackEvent("assessment_cta_clicked", params);
}

/** User clicks "Join" or "Register" anywhere on the site. */
export function trackSignupIntent(source: string) {
  trackEvent("signup_intent", { source });
}
