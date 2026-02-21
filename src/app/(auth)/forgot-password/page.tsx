"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/auth";
import { buildAppUrl } from "@/lib/config";
import Link from "next/link";
import { FormEvent, useState } from "react";

/** Convert raw error messages to user-friendly text */
function formatErrorMessage(message: string): string {
  if (
    message.includes("RATE_LIMIT") ||
    message.toLowerCase().includes("rate limit")
  ) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  return message;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = buildAppUrl("/auth/callback?next=/reset-password");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );

    setLoading(false);

    if (resetError) {
      setError(formatErrorMessage(resetError.message));
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Account recovery
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Reset password</h1>
        <p className="text-sm text-slate-600">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </header>

      <Card className="space-y-6">
        {success ? (
          <>
            <Alert variant="success" title="Check your email">
              We've sent a password reset link to{" "}
              <strong>{email.trim()}</strong>. Open it to set a new password.
            </Alert>
            <div className="space-y-1 text-sm text-slate-500">
              <p className="font-medium text-slate-700">Didn't get it?</p>
              <ul className="space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a minute and try again below</li>
              </ul>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setSuccess(false)}
            >
              Try a different email
            </Button>
          </>
        ) : (
          <>
            {error && (
              <Alert variant="error" title="Unable to send reset email">
                {error}
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                name="email"
                label="Email Address"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email.trim()}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </>
        )}

        <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-600">
          <p>
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-cyan-700 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
