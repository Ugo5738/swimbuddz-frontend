"use client";

import { CheckCircle, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WHATSAPP_GROUP_URL } from "@/lib/config";

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
                            <h3 className="font-medium text-slate-900">Join our WhatsApp group</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                Stay connected with fellow swimmers, get updates, and participate in community discussions.
                            </p>
                            <a
                                href={WHATSAPP_GROUP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                            >
                                Join WhatsApp Group
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                            3
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">Team review (Club & Academy)</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                For Club and Academy members, our team will review your registration and contact
                                you within 48 hours with payment details and next steps.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-700">
                            4
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">Get started</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                Once your email is verified, log in to access your dashboard, view upcoming events,
                                and connect with the community.
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
