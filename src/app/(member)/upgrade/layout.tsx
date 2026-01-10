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

function StepIndicator() {
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
        <div className="flex gap-2">
            {relevantSteps.map((step, index) => {
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;

                return (
                    <div
                        key={step.path}
                        className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${isActive
                            ? "bg-cyan-600 text-white"
                            : isCompleted
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                    >
                        {step.label}
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
                {/* Back link - above progress */}
                <div className="flex justify-start">
                    <Link
                        href="/account/billing"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-2"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Billing</span>
                    </Link>
                </div>

                {/* Tab-style step indicator */}
                <StepIndicator />

                {/* Page content */}
                {children}
            </div>
        </UpgradeProvider>
    );
}
