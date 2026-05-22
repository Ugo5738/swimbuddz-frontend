"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import { uploadMedia } from "@/lib/media";
import { useState } from "react";
import { toast } from "sonner";

import type { PaymentRecord } from "../types";
import { formatCurrency } from "../utils";

type Props = {
  pendingTransfers: PaymentRecord[];
  onReload: () => Promise<void> | void;
};

export function PendingTransfersCard({ pendingTransfers, onReload }: Props) {
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<{ [ref: string]: File | null }>({});

  if (pendingTransfers.length === 0) return null;

  const submitProof = async (payment: PaymentRecord) => {
    const file = proofFile[payment.reference];
    if (!file) return;

    setUploadingProof(payment.reference);
    try {
      const mediaItem = await uploadMedia(
        file,
        "payment_proof",
        payment.reference,
        `Payment proof ${payment.reference}`,
      );
      const proofMediaId = mediaItem.id;

      await apiPost(
        `/api/v1/payments/${payment.reference}/proof`,
        { proof_media_id: proofMediaId },
        { auth: true },
      );
      toast.success("Proof uploaded! Awaiting admin review.");
      await onReload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploadingProof(null);
    }
  };

  return (
    <Card className="p-4 md:p-6 space-y-3 md:space-y-4 border-amber-200 bg-amber-50">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-amber-900">
          🏦 Pending Bank Transfers
        </h2>
        <p className="text-xs md:text-sm text-amber-700 mt-0.5 md:mt-1">
          Complete your payment by uploading proof of transfer.
        </p>
      </div>

      <div className="space-y-3 md:space-y-4">
        {pendingTransfers.map((payment) => (
          <div
            key={payment.id}
            className="bg-white rounded-lg border border-amber-200 p-3 md:p-4 space-y-3"
          >
            {/* Payment info - stacked on mobile */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 text-sm">
                  {payment.purpose?.replace(/_/g, " ").toUpperCase() || "Payment"}
                </p>
                <p className="text-xs text-slate-500 truncate">Ref: {payment.reference}</p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                <p className="text-base md:text-lg font-bold text-slate-900">
                  {formatCurrency(payment.amount)}
                </p>
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                    payment.status === "pending_review"
                      ? "bg-blue-100 text-blue-800"
                      : payment.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {payment.status === "pending_review"
                    ? "Under Review"
                    : payment.status === "failed"
                      ? "Rejected"
                      : "Awaiting Proof"}
                </span>
              </div>
            </div>

            {/* Rejection Note */}
            {payment.status === "failed" && payment.admin_review_note && (
              <Alert variant="error" className="text-xs md:text-sm">
                <strong>Rejection reason:</strong> {payment.admin_review_note}
              </Alert>
            )}

            {/* Upload Section */}
            {(payment.status === "pending" || payment.status === "failed") && (
              <div className="space-y-2">
                <p className="text-xs md:text-sm text-slate-600">
                  📤 Upload proof of payment (screenshot or receipt)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setProofFile({
                        ...proofFile,
                        [payment.reference]: e.target.files?.[0] || null,
                      })
                    }
                    className="flex-1 text-xs md:text-sm text-slate-500 file:mr-2 md:file:mr-3 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-medium file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                  />
                  <Button
                    size="sm"
                    className="w-full sm:w-auto flex-shrink-0"
                    disabled={
                      !proofFile[payment.reference] ||
                      uploadingProof === payment.reference
                    }
                    onClick={() => submitProof(payment)}
                  >
                    {uploadingProof === payment.reference ? "Uploading..." : "Submit"}
                  </Button>
                </div>
              </div>
            )}

            {/* Under Review Message */}
            {payment.status === "pending_review" && (
              <div className="flex items-start gap-2 text-xs md:text-sm text-blue-700 bg-blue-50 p-2.5 md:p-3 rounded-lg">
                <span className="flex-shrink-0">⏳</span>
                <span>
                  Your proof is being reviewed by our team. You'll be notified once
                  approved.
                </span>
              </div>
            )}

            {/* Bank Details Reminder */}
            <details className="text-xs md:text-sm">
              <summary className="cursor-pointer text-amber-700 hover:text-amber-800">
                View bank transfer details
              </summary>
              <div className="mt-2 p-2.5 md:p-3 bg-amber-50 rounded-lg space-y-1 text-amber-800">
                <p>
                  <span className="text-amber-600">Bank:</span> <strong>OPay</strong>
                </p>
                <p>
                  <span className="text-amber-600">Account Number:</span>{" "}
                  <strong>7033588400</strong>
                </p>
                <p>
                  <span className="text-amber-600">Account Name:</span>{" "}
                  <strong>Ugochukwu Nwachukwu</strong>
                </p>
              </div>
            </details>
          </div>
        ))}
      </div>
    </Card>
  );
}
