export type CachedPaymentIntent = {
  reference: string;
  checkout_url?: string | null;
  purpose?: string | null;
  created_at?: string | null;
  member_key?: string | null;
  saved_at?: number;
};

const PAYMENT_INTENT_CACHE_KEY = "swimbuddz:payment:last_intent";
const PAYMENT_INTENT_MAX_AGE_MS = 1000 * 60 * 60 * 6;

export function savePaymentIntentCache(
  intent: CachedPaymentIntent,
  memberKey?: string,
) {
  if (typeof window === "undefined") return;
  if (!intent.reference) return;
  const payload: CachedPaymentIntent = {
    reference: intent.reference,
    checkout_url: intent.checkout_url ?? null,
    purpose: intent.purpose ?? null,
    created_at: intent.created_at ?? null,
    member_key: memberKey ?? null,
    saved_at: Date.now(),
  };
  try {
    window.localStorage.setItem(
      PAYMENT_INTENT_CACHE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore localStorage failures.
  }
}

export function loadPaymentIntentCache(
  memberKey?: string,
  maxAgeMs = PAYMENT_INTENT_MAX_AGE_MS,
): CachedPaymentIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PAYMENT_INTENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPaymentIntent;
    if (memberKey) {
      if (!parsed.member_key || parsed.member_key !== memberKey) return null;
    }
    const savedAt = Number(parsed?.saved_at);
    if (!Number.isFinite(savedAt)) return null;
    if (Date.now() - savedAt > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPaymentIntentCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PAYMENT_INTENT_CACHE_KEY);
  } catch {
    // Ignore localStorage failures.
  }
}
