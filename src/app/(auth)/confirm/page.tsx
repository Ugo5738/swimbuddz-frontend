"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";
import { completePendingRegistrationOnBackend, getPostAuthRedirectPath } from "@/lib/registration";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function getParam(name: string) {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hashParams.get(name) ?? searchParams.get(name);
}

export default function ConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const didRun = useRef(false);

  useEffect(() => {
    async function confirm() {
      if (didRun.current) return;
      didRun.current = true;
      setError(null);

      const accessToken = getParam("access_token");
      const refreshToken = getParam("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("Confirmation tokens are missing. Please return to the app and log in manually.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const completion = await completePendingRegistrationOnBackend();
      if (completion.status === "error") {
        setError(completion.message);
        return;
      }

      const nextPath = await getPostAuthRedirectPath();
      router.replace(nextPath);
    }

    void confirm();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="space-y-4 p-6" aria-busy={!error}>
          <h1 className="text-2xl font-semibold text-slate-900">Finishing verification…</h1>
          {error ? (
            <Alert variant="error" title="Unable to finish confirmation">
              {error}
            </Alert>
          ) : (
            <p className="text-sm text-slate-600">Please hold while we verify your email and prepare your SwimBuddz profile.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
