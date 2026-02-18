"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";
import {
  completePendingRegistrationOnBackend,
  getPostAuthRedirectPath,
} from "@/lib/registration";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function getParam(name: string) {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, ""),
  );
  return hashParams.get(name) ?? searchParams.get(name);
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
          type: type as
            | "signup"
            | "email"
            | "recovery"
            | "invite"
            | "magiclink"
            | "email_change",
        });

        if (verifyError) {
          // Handle specific error cases
          if (verifyError.message.includes("expired")) {
            setError(
              "This confirmation link has expired. Please request a new one.",
            );
          } else if (verifyError.message.includes("already")) {
            setError(
              "This email has already been confirmed. You can log in now.",
            );
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
        router.replace(nextPath);
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
            setError(
              "This confirmation link has expired. Please request a new one.",
            );
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
        router.replace(nextPath);
        return;
      }

      // No valid tokens found - check if user is already logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // User is already authenticated, just redirect
        const nextPath = await getPostAuthRedirectPath();
        router.replace(nextPath);
        return;
      }

      // No tokens and not logged in
      setError(
        "Confirmation tokens are missing. The link may have been truncated or expired. Please request a new confirmation email.",
      );
      setIsProcessing(false);
    }

    void confirm();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="space-y-4 p-6" aria-busy={isProcessing && !error}>
          <h1 className="text-2xl font-semibold text-slate-900">
            {error ? "Verification Issue" : "Finishing verification..."}
          </h1>
          {error ? (
            <>
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
            <p className="text-sm text-slate-600">
              Please hold while we verify your email and prepare your SwimBuddz
              profile.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
