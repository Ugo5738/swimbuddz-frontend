"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowRight, CheckCircle, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/auth";

function RegistrationSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get("redirect");
    const registeredEmail = searchParams.get("email"); // Get email from URL params
    const isCoachRegistration = redirectPath === "/coach/apply";

    const [email, setEmail] = useState(registeredEmail || "");
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleResendEmail = async () => {
        if (!email.trim()) {
            setResendMessage({ type: "error", text: "Please enter your email address" });
            return;
        }

        setResending(true);
        setResendMessage(null);

        try {
            const { error } = await supabase.auth.resend({
                type: "signup",
                email: email.trim(),
            });

            if (error) {
                setResendMessage({ type: "error", text: error.message });
            } else {
                setResendMessage({ type: "success", text: "Confirmation email sent! Please check your inbox and spam folder." });
            }
        } catch {
            setResendMessage({ type: "error", text: "Failed to resend email. Please try again." });
        } finally {
            setResending(false);
        }
    };

    useEffect(() => {
        const reference = searchParams.get("reference") || searchParams.get("trxref");
        if (!reference) return;
        router.replace(`/account/billing?provider=paystack&reference=${encodeURIComponent(reference)}`);
    }, [router, searchParams]);

    if (isCoachRegistration) {
        return (
            <div className="mx-auto max-w-2xl space-y-8 py-12">
                {/* Success Icon */}
                <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle className="h-12 w-12 text-emerald-600" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold text-slate-900">
                        Account Created!
                    </h1>
                    <p className="mt-3 text-lg text-slate-600">
                        You're one step closer to becoming a SwimBuddz Coach.
                    </p>
                </div>

                {/* What's Next for Coaches */}
                <Card className="space-y-6 p-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">What happens next?</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            You're almost there! Just a few more steps to complete your coach application.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                                1
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-slate-900">Check your email</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    We've sent a confirmation email to verify your account. Please click the link to activate.
                                </p>

                                {/* Resend Email Section */}
                                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 mb-2">Didn't receive the email?</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleResendEmail}
                                            disabled={resending}
                                        >
                                            {resending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                            <span className="ml-1">{resending ? "Sending..." : "Resend"}</span>
                                        </Button>
                                    </div>
                                    {resendMessage && (
                                        <p className={`mt-2 text-xs ${resendMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                                            {resendMessage.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                                2
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Log in and complete your application</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    After confirming your email, log in and visit the coach application page to submit your application.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                                3
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Wait for approval</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Our team will review your application within 48–72 hours and notify you by email.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Links */}
                <Card className="bg-slate-50 p-6">
                    <h3 className="mb-4 font-semibold text-slate-900">Next Step</h3>
                    <div className="space-y-3">
                        <Link
                            href="/login?redirect=/coach/apply"
                            className="flex items-center justify-between rounded-md border border-cyan-300 bg-cyan-50 p-3 text-sm font-medium text-cyan-900 transition-colors hover:bg-cyan-100"
                        >
                            <span>Log in to complete your coach application</span>
                            <ArrowRight className="h-4 w-4 text-cyan-600" />
                        </Link>

                        <Link
                            href="/"
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50"
                        >
                            <span>Return to homepage</span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                        </Link>
                    </div>
                </Card>

                {/* Support */}
                <div className="text-center text-sm text-slate-600">
                    <p>
                        Have questions?{" "}
                        <a href="mailto:hello@swimbuddz.com" className="text-cyan-600 hover:text-cyan-700 hover:underline">
                            Contact our support team
                        </a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8 py-12">
            {/* Success Icon */}
            <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-12 w-12 text-emerald-600" />
                </div>
                <h1 className="mt-6 text-3xl font-bold text-slate-900">
                    Registration Successful!
                </h1>
                <p className="mt-3 text-lg text-slate-600">
                    Welcome to the SwimBuddz community!
                </p>
            </div>

            {/* What's Next */}
            <Card className="space-y-6 p-6">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">What happens next?</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        We're excited to have you join us. Here's what to expect:
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                            1
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-slate-900">Check your email</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                We've sent a confirmation email to verify your account. Please click the link
                                to activate your membership.
                            </p>

                            {/* Resend Email Section */}
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs text-slate-500 mb-2">Didn't receive the email?</p>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleResendEmail}
                                        disabled={resending}
                                    >
                                        {resending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                        <span className="ml-1">{resending ? "Sending..." : "Resend"}</span>
                                    </Button>
                                </div>
                                {resendMessage && (
                                    <p className={`mt-2 text-xs ${resendMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                                        {resendMessage.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                            2
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">Activate Community (₦20,000 / year)</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                After you confirm your email and log in, you'll be prompted to activate your annual Community membership to unlock member features.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                            3
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">Next steps (Club & Academy)</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                If you selected Club or Academy, you'll complete onboarding after login and request an upgrade. Club is paid when you activate; Academy is paid when you enroll in a cohort.
                            </p>
                            <p className="mt-2 text-sm">
                                <Link href="/membership" className="font-semibold text-cyan-700 hover:underline">
                                    How membership works
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Quick Links */}
            <Card className="bg-slate-50 p-6">
                <h3 className="mb-4 font-semibold text-slate-900">Quick Links</h3>
                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50"
                    >
                        <span>Log in to your account</span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>

                    <Link
                        href="/"
                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50"
                    >
                        <span>Return to homepage</span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                </div>
            </Card>

            {/* Support */}
            <div className="text-center text-sm text-slate-600">
                <p>
                    Have questions?{" "}
                    <a href="mailto:hello@swimbuddz.com" className="text-cyan-600 hover:text-cyan-700 hover:underline">
                        Contact our support team
                    </a>
                </p>
            </div>
        </div>
    );
}

export default function RegistrationSuccessPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <RegistrationSuccessContent />
        </Suspense>
    );
}

