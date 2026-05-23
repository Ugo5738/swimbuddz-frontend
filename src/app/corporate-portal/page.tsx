"use client";

// Magic-link sign-in for the HR portal. Renders an email input that posts
// to /corporate/me/auth/request-link with the verify-page URL as callback.
// After submission we show a generic "check your inbox" message — the
// backend always returns success regardless of whether the email matched
// an active contact (anti-enumeration), so the UI mirrors that.

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { portalApi } from "@/lib/corporate/portal-api";

export default function CorporatePortalLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}/corporate-portal/verify`;
      await portalApi.requestLink(email.trim(), callbackUrl);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card>
        <ShieldCheck className="h-6 w-6 text-sky-600" />
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          HR / People Ops sign-in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          If your company has signed up for the SwimBuddz 12-week corporate
          wellness program, this is where you track your team. View who&apos;s
          enrolled, see attendance and milestones, and pull the SwimBuddz
          Wrapped report — no need to chat us for status.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Use the work email your account manager has on file. We&apos;ll
          email you a one-time sign-in link — no password required.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Not signed up yet?{" "}
          <a
            href="/corporate"
            className="text-sky-700 underline underline-offset-2"
          >
            Learn about the program
          </a>
          .
        </p>

        {status !== "sent" ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="you@company.com"
              />
            </div>

            {status === "error" && error && (
              <p className="text-sm text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {status === "submitting" ? "Sending…" : "Send sign-in link"}
              {status !== "submitting" && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
              <div>
                <p className="font-medium">Check your inbox</p>
                <p className="mt-1 text-sm text-emerald-800">
                  If <strong>{email}</strong> is on file, we&apos;ve sent
                  you a sign-in link. It&apos;s valid for 24 hours.
                </p>
                <p className="mt-3 text-xs text-emerald-700">
                  Didn&apos;t get it? Check your spam folder, or contact us
                  at{" "}
                  <a
                    href="mailto:swimbuddz@gmail.com"
                    className="underline underline-offset-2"
                  >
                    swimbuddz@gmail.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
