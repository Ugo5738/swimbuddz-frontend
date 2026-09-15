"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiPost } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { PaymentProofLink } from "@/components/admin/PaymentProofLink";
import { formatDistance } from "date-fns";
import { useState } from "react";

interface Payment {
  id: string;
  reference: string;
  member_auth_id: string;
  payer_email: string | null;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  proof_of_payment_media_id: string | null;
  admin_review_note: string | null;
  created_at: string;
}

export default function AdminPaymentsPage() {
  const {
    data,
    loading,
    error: loadError,
    refetch: fetchPendingPayments,
  } = useApi<Payment[]>("/api/v1/payments/admin/pending-reviews");
  const payments = data ?? [];
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<{ [key: string]: string }>({});
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const handleApprove = async (reference: string) => {
    if (
      !confirm(
        "Confirm the bank credit and the amount allocated to this payment. Approve this payment and activate its access?"
      )
    )
      return;
    setProcessingId(reference);
    setError("");
    try {
      await apiPost(
        `/api/v1/payments/admin/${reference}/approve`,
        { note: reviewNote[reference]?.trim() || "Bank credit verified via admin panel" },
        { auth: true }
      );
      fetchPendingPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve payment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reference: string) => {
    setProcessingId(reference);
    setError("");
    try {
      await apiPost(
        `/api/v1/payments/admin/${reference}/reject`,
        { note: rejectNote[reference] || "Proof of payment rejected" },
        { auth: true }
      );
      fetchPendingPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject payment");
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = "NGN") => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
          Admin · Payments
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Payment Reviews</h1>
        <p className="text-slate-600 mt-2">Review and approve manual bank transfer payments</p>
      </div>

      {(error || loadError) && <Alert variant="error">{error || loadError}</Alert>}

      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-slate-500">Loading pending payments...</p>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <p className="text-2xl">✅</p>
            <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
            <p className="text-slate-600">No payments awaiting review.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-6 space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{payment.reference}</h3>
                  <p className="text-sm text-slate-600">{payment.payer_email || "Unknown email"}</p>
                  <p className="text-xs text-slate-500">
                    Created{" "}
                    {formatDistance(new Date(payment.created_at), new Date(), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                    {payment.purpose.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Proof of Payment */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Proof of Payment</h4>
                <PaymentProofLink mediaId={payment.proof_of_payment_media_id} />
              </div>

              {/* Actions */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <Input
                  label="Verification / allocation note"
                  value={reviewNote[payment.reference] ?? ""}
                  maxLength={500}
                  onChange={(event) =>
                    setReviewNote({ ...reviewNote, [payment.reference]: event.target.value })
                  }
                  hint="Record the bank reference and received date. If one transfer covers Membership and swims, specify this payment’s allocated amount and record the remaining portion separately—never credit the full transfer twice."
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleApprove(payment.reference)}
                    disabled={processingId === payment.reference}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    ✓ Approve Payment
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReject(payment.reference)}
                    disabled={processingId === payment.reference}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    ✕ Reject
                  </Button>
                </div>
                <div>
                  <Input
                    placeholder="Rejection reason (optional)"
                    value={rejectNote[payment.reference] || ""}
                    onChange={(e) =>
                      setRejectNote({
                        ...rejectNote,
                        [payment.reference]: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button variant="secondary" onClick={fetchPendingPayments} disabled={loading}>
        🔄 Refresh
      </Button>
    </div>
  );
}
