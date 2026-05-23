"use client";

// Callback page for the magic-link flow. The URL the user clicks on lands
// here with ?token=…; we POST it to /me/auth/verify, store the returned
// session token in localStorage, then redirect to /corporate-portal/dashboard.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { portalApi, storePortalSession } from "@/lib/corporate/portal-api";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("This link is missing its sign-in token. Request a new one.");
      return;
    }
    let cancelled = false;
    async function run() {
      try {
        const session = await portalApi.verifyToken(token as string);
        if (cancelled) return;
        storePortalSession(session);
        router.replace("/corporate-portal/dashboard");
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't verify this link. Request a new one.",
        );
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-rose-600" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                We couldn&apos;t sign you in
              </h1>
              <p className="mt-1 text-sm text-slate-600">{error}</p>
              <a
                href="/corporate-portal"
                className="mt-4 inline-flex rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Request a new sign-in link
              </a>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          Signing you in…
        </div>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md">
          <Card>
            <div className="flex items-center gap-3 text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
              Loading…
            </div>
          </Card>
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
