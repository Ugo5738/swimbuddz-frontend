"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

type ApprovalStatus = "pending" | "approved" | "rejected" | "loading";

export default function RegistrationPendingPage() {
    const router = useRouter();
    const [status, setStatus] = useState<ApprovalStatus>("loading");
    const [memberName, setMemberName] = useState("");

    useEffect(() => {
        checkApprovalStatus();
    }, []);

    const checkApprovalStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push("/login");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/members/me`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (response.ok) {
                const member = await response.json();
                setMemberName(member.first_name);
                setStatus(member.approval_status || "pending");

                // If approved, redirect to profile
                if (member.approval_status === "approved") {
                    // Force session refresh to ensure middleware sees the new status
                    await supabase.auth.refreshSession();
                    router.push("/profile");
                }
            } else {
                // Member not found - maybe registration incomplete
                setStatus("pending");
            }
        } catch (error) {
            console.error("Failed to check approval status:", error);
            setStatus("pending");
        }
    };

    const handleRefresh = () => {
        setStatus("loading");
        checkApprovalStatus();
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <Card className="max-w-lg w-full p-8 text-center">
                {status === "loading" && (
                    <>
                        <div className="animate-spin h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-6" />
                        <h1 className="text-xl font-bold text-slate-900 mb-2">
                            Checking your status...
                        </h1>
                    </>
                )}

                {status === "pending" && (
                    <>
                        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                            <Clock className="h-10 w-10 text-amber-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Thanks for registering{memberName ? `, ${memberName}` : ""}!
                        </h1>
                        <p className="text-slate-600 mb-6">
                            Your account is currently under review. Our team is reviewing your application to ensure SwimBuddz is a safe and welcoming community for everyone.
                        </p>
                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                            <h3 className="font-semibold text-slate-900 mb-3">What happens next?</h3>
                            <ul className="text-left text-sm text-slate-600 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-500 mt-0.5">✓</span>
                                    Our team reviews your application
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-500 mt-0.5">✓</span>
                                    You&apos;ll receive an email once approved
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-500 mt-0.5">✓</span>
                                    Then you can access all SwimBuddz features
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={handleRefresh}
                            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Check status again
                        </button>
                    </>
                )}

                {status === "approved" && (
                    <>
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-10 w-10 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            You&apos;re approved! 🎉
                        </h1>
                        <p className="text-slate-600 mb-6">
                            Welcome to SwimBuddz{memberName ? `, ${memberName}` : ""}! Redirecting you to your profile...
                        </p>
                        <button
                            onClick={async () => {
                                await supabase.auth.refreshSession();
                                router.push("/profile");
                            }}
                            className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-700 transition-colors"
                        >
                            Go to Profile
                        </button>
                    </>
                )}

                {status === "rejected" && (
                    <>
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                            <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Application Not Approved
                        </h1>
                        <p className="text-slate-600 mb-6">
                            Unfortunately, your application wasn&apos;t approved at this time. This could be due to incomplete information or not meeting our community guidelines.
                        </p>
                        <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
                            <h3 className="font-semibold text-slate-900 mb-2">You can reapply</h3>
                            <p className="text-sm text-slate-600">
                                If you believe this was a mistake or you&apos;d like to provide more information, you can register again with a complete profile.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-700 transition-colors"
                            >
                                Apply Again
                            </Link>
                            <Link
                                href="/"
                                className="text-slate-600 hover:text-slate-900 text-sm"
                            >
                                Return to Homepage
                            </Link>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
