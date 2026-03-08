"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { CheckCircle, ShoppingBag, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface VerifyResponse {
  status: "success" | "failed" | "pending";
  order_id: string;
  order_number: string;
  amount_ngn: number;
  message: string;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [verifyState, setVerifyState] = useState<"loading" | "success" | "failed" | "pending">(
    "loading"
  );
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!reference) {
      router.replace("/store");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const result = await apiGet<VerifyResponse>(
          `/api/v1/store/checkout/verify/${encodeURIComponent(reference!)}`,
          { auth: true }
        );

        if (cancelled) return;

        setData(result);
        setVerifyState(result.status);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Payment verification failed";
        setErrorMessage(message);
        setVerifyState("failed");
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  if (verifyState === "loading") {
    return <LoadingCard text="Verifying your payment..." />;
  }

  if (verifyState === "success" && data) {
    return (
      <Card className="max-w-lg mx-auto text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful</h1>
        <p className="text-slate-600 mb-1">{data.message}</p>
        <p className="text-sm text-slate-500 mb-6">
          Order <span className="font-semibold">{data.order_number}</span>
          {" \u00b7 "}
          <span className="font-semibold">
            {"\u20A6"}
            {data.amount_ngn.toLocaleString()}
          </span>{" "}
          paid
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={`/account/orders/${data.order_number}`}>
            <Button size="lg">
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                View Order
              </span>
            </Button>
          </Link>
          <Link href="/store">
            <Button variant="secondary">Continue Shopping</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (verifyState === "pending" && data) {
    return (
      <Card className="max-w-lg mx-auto text-center p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Processing</h1>
        <p className="text-slate-600 mb-1">{data.message}</p>
        <p className="text-sm text-slate-500 mb-6">
          Order <span className="font-semibold">{data.order_number}</span> is being confirmed. This
          usually takes a few moments.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => window.location.reload()}>
            Check Again
          </Button>
          <Link href="/store">
            <Button variant="secondary">Continue Shopping</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Failed state
  return (
    <Card className="max-w-lg mx-auto text-center p-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-4">
        <XCircle className="w-8 h-8 text-rose-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h1>
      <p className="text-slate-600 mb-6">
        {data?.message || errorMessage || "We could not verify your payment."}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/store/checkout">
          <Button size="lg">Try Again</Button>
        </Link>
        <Link href="/store">
          <Button variant="secondary">Back to Store</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function PaymentVerifyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Suspense fallback={<LoadingCard text="Verifying your payment..." />}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
