"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/auth";
import Link from "next/link";
import { useState } from "react";

/** Convert raw error messages to user-friendly text */
function formatErrorMessage(message: string): string {
    // Handle rate limit errors
    if (message.includes("RATE_LIMIT") || message.toLowerCase().includes("rate limit")) {
        return "Too many attempts. Please wait a few minutes before trying again.";
    }
    // Handle email already confirmed
    if (message.toLowerCase().includes("already confirmed") || message.toLowerCase().includes("already registered")) {
        return "This email is already confirmed. You can log in directly.";
    }
    // Handle user not found
    if (message.toLowerCase().includes("user not found") || message.toLowerCase().includes("no user")) {
        return "No account found with this email. Please check the email address or register a new account.";
    }
    return message;
}

export default function ResendConfirmationPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            const emailRedirectTo =
                typeof window !== "undefined" ? `${window.location.origin}/confirm` : undefined;
            const { error: resendError } = await supabase.auth.resend({
                type: "signup",
                email: email.trim(),
                options: emailRedirectTo ? { emailRedirectTo } : undefined,
            });

            if (resendError) {
                throw resendError;
            }

            setSuccess(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to resend confirmation email";
            setError(formatErrorMessage(message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <header className="space-y-2 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
                    Email verification
                </p>
                <h1 className="text-3xl font-bold text-slate-900">
                    Resend Confirmation Email
                </h1>
                <p className="text-sm text-slate-600">
                    Didn't receive the confirmation email? Enter your email address and we'll send a new one.
                </p>
            </header>

            <Card className="space-y-6">
                {success ? (
                    <Alert variant="success" title="Email sent!">
                        We've sent a new confirmation email to <strong>{email}</strong>.
                        Please check your inbox (and spam folder) and click the link to confirm your account.
                    </Alert>
                ) : (
                    <>
                        {error && (
                            <Alert variant="error" title="Unable to send email">
                                {error}
                            </Alert>
                        )}
                        <form onSubmit={handleResend} className="space-y-4">
                            <Input
                                type="email"
                                name="email"
                                label="Email Address"
                                placeholder="you@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                                {loading ? "Sending..." : "Resend Confirmation Email"}
                            </Button>
                        </form>
                    </>
                )}

                <div className="border-t border-slate-200 pt-4 space-y-2 text-center text-sm text-slate-600">
                    <p>
                        Already confirmed?{" "}
                        <Link href="/login" className="font-semibold text-cyan-700 hover:underline">
                            Log in
                        </Link>
                    </p>
                    <p>
                        Need an account?{" "}
                        <Link href="/register" className="font-semibold text-cyan-700 hover:underline">
                            Register
                        </Link>
                    </p>
                </div>
            </Card>

            <div className="text-center text-sm text-slate-500">
                <p className="font-medium">Didn't find the email?</p>
                <ul className="mt-2 space-y-1">
                    <li>• Check your spam/junk folder</li>
                    <li>• Make sure you entered the correct email</li>
                    <li>• Wait a few minutes and try again</li>
                </ul>
            </div>
        </div>
    );
}
