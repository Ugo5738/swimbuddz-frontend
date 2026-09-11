/** Accept only local destinations, including when links came from email. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return null;
    const url = new URL(value, "https://swimbuddz.invalid");
    return url.origin === "https://swimbuddz.invalid" ? value : null;
  } catch {
    return null;
  }
}

export function isAcademyDestination(value: string | null | undefined): boolean {
  const safe = safeReturnPath(value);
  if (!safe) return false;
  const url = new URL(safe, "https://swimbuddz.invalid");
  return (
    /^\/(account\/academy|upgrade\/academy)(\/|$)/.test(url.pathname) ||
    (url.pathname === "/checkout" && url.searchParams.get("purpose") === "academy_cohort")
  );
}
