"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/auth";
import { completePendingRegistrationOnBackend, getPostAuthRedirectPath } from "@/lib/registration";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function getParam(name: string) {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hashParams.get(name) ?? searchParams.get(name);
}

// Recovers a `next` deep-link target that was stashed by /register before the
// user clicked the email confirmation link. Cleared after read so it doesn't
// leak into a future session. If the resolved auth path is /account/onboarding
// we append `?next=...` so onboarding can route the user back to the deep link
// once they finish onboarding; otherwise we route directly to `next`.
function applyPendingNext(nextPath: string): string {
  if (typeof window === "undefined") return nextPath;
  let pending: string | null = null;
  try {
    pending = window.sessionStorage.getItem("post_auth_next");
    if (pending) window.sessionStorage.removeItem("post_auth_next");
  } catch {
    return nextPath;
  }
  // Only trust same-origin relative paths.
  if (!pending || !pending.startsWith("/") || pending.startsWith("//")) {
    return nextPath;
  }
  if (nextPath.startsWith("/account/onboarding")) {
    const sep = nextPath.includes("?") ? "&" : "?";
    return `${nextPath}${sep}next=${encodeURIComponent(pending)}`;
  }
  return pending;
}

export default function ConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const didRun = useRef(false);

  useEffect(() => {
    async function confirm() {
      if (didRun.current) return;
      didRun.current = true;
      setError(null);
      setIsProcessing(true);

      // Check for PKCE flow parameters (token_hash + type)
      const tokenHash = getParam("token_hash");
      const type = getParam("type");

      // Check for implicit flow parameters (access_token + refresh_token)
      const accessToken = getParam("access_token");
      const refreshToken = getParam("refresh_token");

      // Also check for error parameters from Supabase
      const errorCode = getParam("error");
      const errorDescription = getParam("error_description");

      if (errorCode) {
        setError(errorDescription || `Authentication error: ${errorCode}`);
        setIsProcessing(false);
        return;
      }

      // PKCE flow: verify OTP with token_hash
      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change",
        });

        if (verifyError) {
          // Handle specific error cases
          if (verifyError.message.includes("expired")) {
            setError("This confirmation link has expired. Please request a new one.");
          } else if (verifyError.message.includes("already")) {
            setError("This email has already been confirmed. You can log in now.");
          } else {
            setError(verifyError.message);
          }
          setIsProcessing(false);
          return;
        }

        // Successfully verified via PKCE, now complete registration
        const completion = await completePendingRegistrationOnBackend();
        if (completion.status === "error") {
          setError(completion.message);
          setIsProcessing(false);
          return;
        }

        const nextPath = await getPostAuthRedirectPath();
        router.replace(applyPendingNext(nextPath));
        return;
      }

      // Implicit flow: set session with access_token + refresh_token
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          if (sessionError.message.includes("expired")) {
            setError("This confirmation link has expired. Please request a new one.");
          } else {
            setError(sessionError.message);
          }
          setIsProcessing(false);
          return;
        }

        const completion = await completePendingRegistrationOnBackend();
        if (completion.status === "error") {
          setError(completion.message);
          setIsProcessing(false);
          return;
        }

        const nextPath = await getPostAuthRedirectPath();
        router.replace(applyPendingNext(nextPath));
        return;
      }

      // No valid tokens found - check if user is already logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // User is already authenticated, just redirect
        const nextPath = await getPostAuthRedirectPath();
        router.replace(applyPendingNext(nextPath));
        return;
      }

      // No tokens and not logged in
      setError(
        "Confirmation tokens are missing. The link may have been truncated or expired. Please request a new confirmation email."
      );
      setIsProcessing(false);
    }

    void confirm();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="space-y-4 p-6" aria-busy={isProcessing && !error}>
          {error ? (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">
                Verification Issue
              </h1>
              <Alert variant="error" title="Unable to finish confirmation">
                {error}
              </Alert>
              <div className="flex flex-col gap-3 pt-2">
                <Link
                  href="/resend-confirmation"
                  className="inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 bg-cyan-600 text-white hover:bg-cyan-500 px-4 py-2.5 text-sm min-h-[44px] w-full"
                >
                  Request New Confirmation Email
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 px-4 py-2.5 text-sm min-h-[44px] w-full"
                >
                  Go to Login
                </Link>
              </div>
              <p className="text-sm text-slate-500 text-center">
                If your email is already confirmed, you can log in directly.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <LoadingSpinner size="lg" />
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900">
                  Finishing verification
                </h1>
                <p className="text-sm text-slate-600">
                  Hang tight — we&apos;re verifying your email and preparing
                  your SwimBuddz profile.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
