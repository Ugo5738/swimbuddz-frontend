"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { authLinkErrorMessage } from "@/lib/authLinkError";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AuthCodeErrorPage() {
  const [message, setMessage] = useState("We couldn't verify this email link.");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    // Supabase's actual error is in the fragment; the callback may only have
    // seen the absence of a code and added error=no_code to the query.
    setMessage(
      authLinkErrorMessage(
        hash.get("error_code") || hash.get("error") || query.get("error_code") || query.get("error"),
        hash.get("error_description") || query.get("error_description"),
      ),
    );
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-6 py-12">
      <h1 className="text-center text-3xl font-bold text-slate-900">Link problem</h1>
      <Card className="space-y-6">
        <Alert variant="error" title="Unable to verify email link">
          {message}
        </Alert>
        <div className="flex flex-col gap-3 text-center font-semibold text-cyan-700">
          <Link href="/forgot-password">Request a new password reset link</Link>
          <Link href="/resend-confirmation">Request a new confirmation email</Link>
          <Link href="/login">Go to login</Link>
        </div>
      </Card>
    </div>
  );
}
