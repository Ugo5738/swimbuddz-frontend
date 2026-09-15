"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";

/** Resolve private receipt media only when an authenticated reviewer requests it. */
export function PaymentProofLink({ mediaId }: { mediaId: string | null }) {
  const [requested, setRequested] = useState(false);
  const { data, error, loading, refetch } = useApi<{ file_url: string }>(
    mediaId && requested ? `/api/v1/media/media/${mediaId}` : null
  );
  if (!mediaId)
    return (
      <p className="text-sm text-amber-700">
        No receipt attached. Verify the bank credit before approving.
      </p>
    );
  return (
    <div className="space-y-2">
      {data?.file_url && !loading && !error ? (
        <a
          href={data.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-700 underline"
        >
          Open uploaded receipt
        </a>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => {
            setRequested(true);
            if (requested) refetch();
          }}
        >
          {loading ? "Loading receipt…" : error ? "Retry loading receipt" : "View receipt"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          Receipt could not be loaded. Retry before reviewing this payment.
        </p>
      )}
    </div>
  );
}
