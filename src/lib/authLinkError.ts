/** Translate expired links and browser-bound code failures into a next step. */
export function authLinkErrorMessage(
  code: string | null,
  description: string | null = null,
): string {
  const detail = `${code ?? ""} ${description ?? ""}`.toLowerCase();
  if (detail.includes("otp_expired") || detail.includes("expired")) {
    return "This email link is invalid, expired, or has already been used. Please request a new link and open only the newest email.";
  }
  if (
    detail.includes("code verifier") ||
    detail.includes("code_verifier") ||
    detail.includes("flow_state") ||
    detail.includes("bad_code_verifier")
  ) {
    return "Please request a new link and open it in the same browser and device you used to request it.";
  }
  if (!code || code === "no_code") {
    return "This email link is missing or invalid. Please request a new link.";
  }
  return description || code;
}
