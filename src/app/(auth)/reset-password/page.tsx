"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PasswordField } from "@/components/ui/PasswordField";
import { supabase } from "@/lib/auth";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";

function getParam(name: string) {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, ""),
  );
  return hashParams.get(name) ?? searchParams.get(name);
}

/** Minimum requirements: 8 chars */
function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

function ResetPasswordContent() {
  // Phase 1: verify the incoming token and establish a session
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const didRun = useRef(false);

  // Phase 2: update password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // On mount, establish session from the incoming reset link.
  //
  // Flow A (PKCE via /auth/callback — recommended):
  //   /auth/callback exchanges the code and sets the session in cookies, then
  //   redirects here. By the time we arrive, supabase.auth.getSession() already
  //   has a valid PASSWORD_RECOVERY session — no token in the URL needed.
  //
  // Flow B (PKCE direct — token_hash + type=recovery in query params):
  //   Supabase skipped /auth/callback and delivered the token directly. We call
  //   verifyOtp to exchange it for a session ourselves.
  //
  // Flow C (Implicit — access_token + refresh_token in hash):
  //   Older / non-PKCE flow. We call setSession directly.
  useEffect(() => {
    async function verifyToken() {
      if (didRun.current) return;
      didRun.current = true;

      const errorCode = getParam("error");
      const errorDescription = getParam("error_description");

      if (errorCode) {
        setTokenError(errorDescription || `Authentication error: ${errorCode}`);
        return;
      }

      // Flow A: session already established by /auth/callback
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setTokenReady(true);
        return;
      }

      // Flow B: PKCE token delivered directly (token_hash + type=recovery)
      const tokenHash = getParam("token_hash");
      const type = getParam("type");
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery",
        });
        if (error) {
          setTokenError(
            error.message.includes("expired")
              ? "This reset link has expired. Please request a new one."
              : error.message,
          );
          return;
        }
        setTokenReady(true);
        return;
      }

      // Flow C: Implicit flow (access_token + refresh_token in URL hash)
      const accessToken = getParam("access_token");
      const refreshToken = getParam("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setTokenError(
            error.message.includes("expired")
              ? "This reset link has expired. Please request a new one."
              : error.message,
          );
          return;
        }
        setTokenReady(true);
        return;
      }

      // No session and no tokens found
      setTokenError(
        "This reset link is missing or invalid. Please request a new password reset.",
      );
    }

    void verifyToken();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const validationError = validatePassword(password);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    if (password !== confirm) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    // Sign out so the user explicitly logs in with the new password
    await supabase.auth.signOut();
    setSuccess(true);
  }

  // --- Render states ---

  if (success) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Password updated
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            All done!
          </h1>
        </header>
        <Card className="space-y-6">
          <Alert variant="success" title="Password changed successfully">
            Your password has been updated. Log in with your new password to
            continue.
          </Alert>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 bg-cyan-600 text-white hover:bg-cyan-500 px-4 py-2.5 text-sm min-h-[44px] w-full"
          >
            Go to login
          </Link>
        </Card>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
            Password reset
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Link problem</h1>
        </header>
        <Card className="space-y-6">
          <Alert variant="error" title="Unable to verify reset link">
            {tokenError}
          </Alert>
          <div className="flex flex-col gap-3">
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 bg-cyan-600 text-white hover:bg-cyan-500 px-4 py-2.5 text-sm min-h-[44px] w-full"
            >
              Request a new reset link
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 px-4 py-2.5 text-sm min-h-[44px] w-full"
            >
              Back to login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!tokenReady) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Password reset
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Choose a new password
        </h1>
        <p className="text-sm text-slate-600">
          Enter a new password for your SwimBuddz account.
        </p>
      </header>

      <Card className="space-y-6">
        {submitError && (
          <Alert variant="error" title="Unable to update password">
            {submitError}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="New password"
            name="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordField
            label="Confirm new password"
            name="confirm"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !password || !confirm}
          >
            {loading ? "Updating..." : "Set new password"}
          </Button>
        </form>
        <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          <p>
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-semibold text-cyan-700 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
