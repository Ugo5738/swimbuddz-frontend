"use client";

import { Card } from "@/components/ui/Card";
import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegistrationSuccessPage() {
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
                        <div>
                            <h3 className="font-medium text-slate-900">Check your email</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                We've sent a confirmation email to verify your account. Please click the link
                                to activate your membership.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                            2
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">Activate Community (₦5,000 / year)</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                After you confirm your email and log in, you’ll be prompted to activate your annual Community membership to unlock member features.
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
                                If you selected Club or Academy, you’ll complete onboarding after login and request an upgrade. Club is paid when you activate; Academy is paid when you enroll in a cohort.
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
