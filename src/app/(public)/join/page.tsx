"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { CheckCircle, Gift, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type CodeValidation = {
  valid: boolean;
  code: string | null;
  message: string | null;
};

// ============================================================================
// Component
// ============================================================================

function JoinPageContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const [validation, setValidation] = useState<CodeValidation | null>(null);
  const [loading, setLoading] = useState(!!refCode);

  useEffect(() => {
    if (!refCode) return;

    async function validate() {
      try {
        const result = await apiGet<CodeValidation>(
          `/api/v1/wallet/referral/validate?code=${encodeURIComponent(refCode)}`
        );
        setValidation(result);
      } catch {
        setValidation({
          valid: false,
          code: refCode || null,
          message: "Could not validate code",
        });
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [refCode]);

  const registerUrl = refCode ? `/register?ref=${encodeURIComponent(refCode)}` : "/register";

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <img src="/logo.png" alt="SwimBuddz" className="h-12 w-auto" />
            <span className="text-2xl font-bold text-cyan-700">SwimBuddz</span>
          </Link>
        </div>

        {/* Hero */}
        <Card className="p-6 md:p-10 text-center bg-white shadow-lg">
          <div className="text-5xl mb-4">🏊</div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            You&apos;ve been invited to SwimBuddz!
          </h1>

          {/* Code validation state */}
          {loading ? (
            <p className="text-slate-500 mb-4">Validating referral code...</p>
          ) : refCode && validation ? (
            validation.valid ? (
              <div className="flex items-center justify-center gap-2 mb-4 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
                <p className="font-medium">
                  Referral code <span className="font-mono font-bold">{refCode}</span> is valid!
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-4 text-amber-600">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">
                  This referral link has expired, but you can still join!
                </p>
              </div>
            )
          ) : null}

          {/* Bonus display */}
          <Card className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-200 mb-6">
            <Gift className="h-8 w-8 text-emerald-500" />
            <div className="text-left">
              <p className="text-lg font-bold text-emerald-800">Sign up and earn 10 🫧</p>
              <p className="text-sm text-emerald-600">
                That&apos;s worth ₦1,000 to use on sessions, events & more
              </p>
            </div>
          </Card>

          <div className="mb-8">
            <Link href={registerUrl}>
              <Button size="lg" className="text-lg px-8 py-3">
                Join SwimBuddz
              </Button>
            </Link>
          </div>

          {/* Value prop */}
          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">What is SwimBuddz?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-3 rounded-lg bg-cyan-50">
                <p className="text-2xl mb-1">🏊</p>
                <p className="text-sm font-medium text-slate-800">Swim Sessions</p>
                <p className="text-xs text-slate-600">
                  Join regular swimming sessions across Lagos
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-2xl mb-1">🎓</p>
                <p className="text-sm font-medium text-slate-800">Learn to Swim</p>
                <p className="text-xs text-slate-600">
                  Academy programs for all levels with expert coaches
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-2xl mb-1">👥</p>
                <p className="text-sm font-medium text-slate-800">Community</p>
                <p className="text-xs text-slate-600">
                  Meet fellow swimmers, share rides, attend events
                </p>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-8">
          Already a member?{" "}
          <Link href="/login" className="text-cyan-600 hover:text-cyan-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white" />}>
      <JoinPageContent />
    </Suspense>
  );
}
