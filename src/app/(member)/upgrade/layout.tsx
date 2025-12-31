"use client";

import { UpgradeProvider } from "@/lib/upgradeContext";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
    { path: "/upgrade/club/readiness", label: "Readiness", tier: "club" },
    { path: "/upgrade/club/plan", label: "Plan", tier: "club" },
    { path: "/upgrade/academy/details", label: "Details", tier: "academy" },
    { path: "/upgrade/academy/cohort", label: "Cohort", tier: "academy" },
    { path: "/checkout", label: "Checkout", tier: "all" },
];

function ProgressIndicator() {
    const pathname = usePathname();

    // Determine current tier flow based on path
    const isClubFlow = pathname.includes("/club/");
    const isAcademyFlow = pathname.includes("/academy/");
    const isCheckout = pathname.includes("/checkout");

    // Filter steps for current flow
    let relevantSteps = STEPS;
    if (isClubFlow) {
        relevantSteps = STEPS.filter((s) => s.tier === "club" || s.tier === "all");
    } else if (isAcademyFlow) {
        relevantSteps = STEPS.filter((s) => s.tier === "academy" || s.tier === "all");
    } else if (isCheckout) {
        // On checkout, show minimal progress
        return null;
    }

    const currentIndex = relevantSteps.findIndex((s) => pathname.startsWith(s.path));

    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {relevantSteps.map((step, index) => {
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;

                return (
                    <div key={step.path} className="flex items-center gap-2">
                        <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${isActive
                                ? "bg-cyan-500 text-white"
                                : isCompleted
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                        >
                            {isCompleted ? "✓" : index + 1}
                        </div>
                        <span
                            className={`text-sm hidden sm:inline ${isActive ? "text-slate-900 font-medium" : "text-slate-500"
                                }`}
                        >
                            {step.label}
                        </span>
                        {index < relevantSteps.length - 1 && (
                            <div
                                className={`w-8 h-0.5 ${isCompleted ? "bg-emerald-500" : "bg-slate-200"
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
    return (
        <UpgradeProvider>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Progress indicator */}
                <ProgressIndicator />

                {/* Back link - subtle placement below progress */}
                <div className="flex justify-start">
                    <Link
                        href="/dashboard/billing"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Billing</span>
                    </Link>
                </div>

                {/* Page content */}
                {children}
            </div>
        </UpgradeProvider>
    );
}
