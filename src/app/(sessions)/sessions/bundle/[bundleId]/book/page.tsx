"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BundleBookingFlow } from "./BundleBookingFlow";

type BundleCart = {
  id: string;
  member_auth_id: string;
  session_ids: string[];
  status: string;
  created_at: string;
  expires_at: string | null;
};

export default function BundleBookPage({ params }: { params: { bundleId: string } }) {
  const [sessionIds, setSessionIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const cart = await apiGet<BundleCart>(`/api/v1/sessions/bundles/${params.bundleId}`, {
          auth: true,
        });
        if (!cart.session_ids || cart.session_ids.length === 0) {
          setError("Bundle is empty.");
          return;
        }
        setSessionIds(cart.session_ids);
      } catch (e) {
        console.error("Failed to load bundle cart:", e);
        setError(
          e instanceof Error && e.message
            ? "This booking bundle is unavailable or expired."
            : "Unable to load booking bundle."
        );
      }
    }
    load();
  }, [params.bundleId]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <Card className="p-6 space-y-6 text-center">
          <Alert variant="error" title="Bundle not found">
            {error}
          </Alert>
          <Link href="/sessions">
            <Button>Back to Sessions</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (sessionIds === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingCard text="Loading bundle..." />
      </div>
    );
  }

  return <BundleBookingFlow ids={sessionIds} />;
}
