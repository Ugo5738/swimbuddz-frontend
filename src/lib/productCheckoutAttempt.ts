/** Retry a lost response with the same server key, including after a refresh. */
export function productCheckoutAttempt(member: string, payload: Record<string, unknown>) {
  const { expected_total_kobo: _expected, idempotency_key: _key, ...selection } = payload;
  const storageKey = `swimbuddz:product-checkout:${member}:${JSON.stringify(selection)}`;
  const existing = localStorage.getItem(storageKey);
  const idempotencyKey = existing || crypto.randomUUID();
  // Fail before payment if this browser cannot preserve its recovery key.
  localStorage.setItem(storageKey, idempotencyKey);
  return { idempotencyKey, complete: () => localStorage.removeItem(storageKey) };
}
