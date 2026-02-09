"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PasswordField } from "@/components/ui/PasswordField";
import { supabase } from "@/lib/auth";
import { completePendingRegistrationOnBackend, getPostAuthRedirectPath } from "@/lib/registration";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const ADMIN_EMAILS = [
  process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  "admin@admin.com",
].filter(Boolean) as string[];

/** Convert raw error messages to user-friendly text */
function formatErrorMessage(message: string): string {
  // Handle rate limit errors
  if (message.includes("RATE_LIMIT") || message.toLowerCase().includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  // Handle JSON-like error responses
  if (message.startsWith("{") || message.includes('"detail"')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.detail) {
        // Recursively format the detail message
        return formatErrorMessage(parsed.detail);
      }
    } catch {
      // If parsing fails, try to extract meaningful text
      const detailMatch = message.match(/"detail"\s*:\s*"([^"]+)"/);
      if (detailMatch) {
        return formatErrorMessage(detailMatch[1]);
      }
    }
  }
  // Handle common Supabase errors
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (message.includes("Email not confirmed")) {
    return "Please confirm your email address first. Check your inbox for the confirmation link.";
  }
  return message;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    const redirectParam = searchParams.get("redirect");
    const errorParam = searchParams.get("error");
    const redirectPath = redirectParam && redirectParam.startsWith("/") ? redirectParam : null;
    if (!redirectPath && !errorParam) return;

    let isMounted = true;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!session) return;
      if (redirectPath) {
        router.replace(redirectPath);
        return;
      }
      const nextPath = await getPostAuthRedirectPath();
      if (!isMounted) return;
      router.replace(nextPath);
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setMagicSent(false);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setLoading(false);
      setError(formatErrorMessage(signInError.message));
      return;
    }

    // Admin users bypass pending-registration completion (they may not have a Member profile).
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    if (signedInUser?.email && ADMIN_EMAILS.includes(signedInUser.email)) {
      setLoading(false);
      router.push("/admin/dashboard");
      return;
    }

    const completion = await completePendingRegistrationOnBackend();
    if (completion.status === "error") {
      setLoading(false);
      setError(formatErrorMessage(completion.message));
      return;
    }

    setLoading(false);

    const redirect = searchParams.get("redirect");
    if (redirect) {
      router.push(redirect);
      return;
    }

    const nextPath = await getPostAuthRedirectPath();
    router.push(nextPath);
  }

  async function handleMagicLink() {
    setError(null);
    setMagicSent(false);
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    const redirectParam = searchParams.get("redirect");
    const nextPath =
      redirectParam && redirectParam.startsWith("/") ? redirectParam : "/account";

    setMagicLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setMagicLoading(false);
    if (otpError) {
      setError(formatErrorMessage(otpError.message));
      return;
    }

    setMagicSent(true);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Account access</p>
        <h1 className="text-3xl font-bold text-slate-900">Log in to SwimBuddz</h1>
        <p className="text-sm text-slate-600">Use your Supabase credentials to access member and admin flows.</p>
      </header>
      <Card className="space-y-6">
        {error ? (
          <Alert variant="error" title="Unable to log in">
            {error}
          </Alert>
        ) : null}
        {magicSent ? (
          <Alert variant="success" title="Check your email">
            We sent a sign-in link to <span className="font-semibold">{email.trim()}</span>. Open it on this device to continue.
          </Alert>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PasswordField
            label="Password"
            name="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="text-center text-sm text-slate-500">or</div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleMagicLink}
          disabled={magicLoading || loading}
        >
          {magicLoading ? "Sending link..." : "Email me a sign-in link"}
        </Button>
        <p className="text-center text-sm text-slate-600">
          New here? <a href="/register" className="font-semibold text-cyan-700 hover:underline">Create an account</a>
        </p>
        <p className="text-center text-sm text-slate-500">
          Didn't get the confirmation email?{" "}
          <a href="/resend-confirmation" className="font-medium text-cyan-600 hover:underline">
            Resend it
          </a>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><LoadingSpinner /></div>}>
      <LoginContent />
    </Suspense>
  );
}
