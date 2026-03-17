"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/auth";
import { VolunteersApi, type QrCheckinResponse } from "@/lib/volunteers";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type CheckinState =
  | { status: "loading" }
  | { status: "success"; data: QrCheckinResponse }
  | { status: "error"; message: string }
  | { status: "no_token" };

export default function QrCheckinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<CheckinState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "no_token" });
      return;
    }

    const doCheckin = async () => {
      // Check if authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login with return URL
        const returnUrl = `/community/volunteers/qr-checkin?token=${token}`;
        router.push(`/auth/login?redirectTo=${encodeURIComponent(returnUrl)}`);
        return;
      }

      try {
        const result = await VolunteersApi.qrCheckin(token);
        setState({ status: "success", data: result });
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Check-in failed. Please try again.";
        setState({ status: "error", message });
      }
    };

    doCheckin();
  }, [token, router]);

  if (state.status === "loading") {
    return <LoadingPage text="Checking you in..." />;
  }

  if (state.status === "no_token") {
    return (
      <div className="mx-auto max-w-md py-16 px-4">
        <Card className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Invalid QR Code</h1>
          <p className="mt-2 text-sm text-slate-600">
            This QR code link is invalid. Please scan the QR code at the pool.
          </p>
          <Link href="/community/volunteers">
            <Button className="mt-6" variant="secondary">
              Go to Volunteer Hub
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md py-16 px-4">
        <Card className="text-center py-12">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Check-in Failed</h1>
          <p className="mt-2 text-sm text-slate-600">{state.message}</p>
          <Link href="/community/volunteers">
            <Button className="mt-6" variant="secondary">
              Go to Volunteer Hub
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Success
  const { data } = state;
  return (
    <div className="mx-auto max-w-md py-16 px-4">
      <Card className="text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <CheckCircle className="h-10 w-10 text-teal-600" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{data.message}</h1>
        <p className="mt-2 text-sm text-slate-600">{data.opportunity_title}</p>
        {data.slot.checked_in_at && (
          <p className="mt-1 text-xs text-slate-400">
            Checked in at{" "}
            {new Date(data.slot.checked_in_at).toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        <Link href="/community/volunteers">
          <Button className="mt-6" variant="secondary">
            Back to Volunteer Hub
          </Button>
        </Link>
      </Card>
    </div>
  );
}
