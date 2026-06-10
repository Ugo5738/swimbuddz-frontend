"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/auth";
import {
  type FoundingStats,
  type FoundingStatus,
  claimFoundingMember,
  getFoundingStats,
  getMyFoundingStatus,
  initializeFoundingPayment,
} from "@/lib/strokelab";
import { Activity, Check, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function FoundingMembersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Paystack appends ?reference=&trxref= when it redirects the user back.
  const returnedReference =
    searchParams.get("reference") || searchParams.get("trxref");

  const [stats, setStats] = useState<FoundingStats | null>(null);
  const [status, setStatus] = useState<FoundingStatus | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getFoundingStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load stats");
    }
  }, []);

  // Initial load: public stats + auth + (if returned from Paystack) claim.
  useEffect(() => {
    loadStats();
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session ?? null;
      setAuthEmail(session?.user?.email ?? null);
      setAuthChecked(true);
      if (!session) return;

      // If signed-in, fetch current claim status.
      try {
        const s = await getMyFoundingStatus();
        setStatus(s);

        // Returned from a Paystack checkout? Record the claim (fallback —
        // the webhook may have already created the row server-side; both
        // are idempotent). Then refresh stats + status.
        if (returnedReference && !s.is_founding_member) {
          setVerifying(true);
          try {
            const result = await claimFoundingMember(returnedReference);
            toast.success(
              result.seat_number > 0
                ? `You're in — seat #${result.seat_number} of 100.`
                : "You're a founding member.",
            );
            await loadStats();
            setStatus(await getMyFoundingStatus());
            // Clean the ?reference= off the URL so a refresh doesn't re-claim.
            router.replace("/founding-members");
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "We couldn't confirm that payment. If you were charged, contact support.",
            );
          } finally {
            setVerifying(false);
          }
        }
      } catch {
        // Non-fatal — landing page still renders.
      }
    });
  }, [loadStats, returnedReference, router]);

  const handleStartCheckout = async () => {
    if (!authEmail) {
      window.location.href = "/auth/sign-in?returnTo=/founding-members";
      return;
    }
    if (!stats || stats.is_sold_out) {
      setError("All founding spots are sold out.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { authorization_url } = await initializeFoundingPayment();
      // Hand off to Paystack's hosted checkout. On completion Paystack
      // redirects back to /founding-members?reference=…
      window.location.href = authorization_url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start payment";
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  };

  if (!stats && !error) return <LoadingPage />;

  const claimedAlready = status?.is_founding_member ?? false;
  const soldOut = stats?.is_sold_out ?? false;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-700">
          <Sparkles className="h-3 w-3" /> Founding members · 100 spots
        </span>
        <h1 className="mt-4 flex items-center justify-center gap-2 text-3xl font-semibold sm:text-4xl">
          <Activity className="h-7 w-7 text-cyan-600" />
          Stroke Lab
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Upload a freestyle clip. We measure your stroke rate, body roll,
          and breath balance — in under two minutes, from your phone, no
          coach in the loop. Lifetime access for the first 100 swimmers.
        </p>
      </header>

      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {verifying ? (
        <Alert variant="info" className="mb-4">
          Confirming your payment…
        </Alert>
      ) : null}

      <Card className="mb-6 text-center">
        {stats ? (
          <>
            <p className="text-sm uppercase tracking-wide text-slate-500">
              Seats remaining
            </p>
            <p className="mt-1 text-5xl font-bold text-slate-900">
              {stats.seats_remaining}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              of {stats.seats_total} ·{" "}
              <span className="font-medium text-slate-700">
                ₦{stats.price_ngn.toLocaleString("en-NG")}
              </span>{" "}
              lifetime
            </p>
          </>
        ) : null}

        <div className="mt-6">
          {claimedAlready ? (
            <Alert variant="success">
              <Check className="-mt-0.5 mr-1 inline h-4 w-4" />
              You&apos;re a founding member.{" "}
              <Link
                href="/account/strokelab"
                className="font-semibold underline"
              >
                Open Stroke Lab →
              </Link>
            </Alert>
          ) : soldOut ? (
            <Alert variant="info">
              <Lock className="-mt-0.5 mr-1 inline h-4 w-4" /> All founding
              spots are taken — a regular tier is coming soon.
            </Alert>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartCheckout}
              disabled={busy || verifying || !authChecked}
            >
              {busy
                ? "Redirecting to Paystack…"
                : authEmail
                  ? "Claim my spot · ₦20,000"
                  : "Sign in to claim"}
            </Button>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Paystack-secured payment. One spot per account. Not a coach
            replacement — share clips with a coach for personal guidance.
          </p>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        <BenefitCard
          title="Lifetime access"
          body="Founding members keep Stroke Lab for life — every new stroke, every new metric, every new model."
        />
        <BenefitCard
          title="50 analyses / month"
          body="Generous quota even after the regular tier launches. Use them on yourself, friends, or your kids."
        />
        <BenefitCard
          title="Shape v1"
          body="Founders vote on which strokes (breast / back / fly), drills, and metrics we ship next."
        />
      </section>

      <p className="mt-10 text-center text-xs text-slate-400">
        Questions? Email{" "}
        <a className="underline" href="mailto:founders@swimbuddz.com">
          founders@swimbuddz.com
        </a>
        .
      </p>
    </main>
  );
}

function BenefitCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-600">{body}</p>
    </Card>
  );
}
