"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { formatDistance } from "date-fns";
import { useEffect, useState } from "react";

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
    proof_of_payment_url: string | null;
    admin_review_note: string | null;
    created_at: string;
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState<{ [key: string]: string }>({});

    const fetchPendingPayments = async () => {
        setLoading(true);
        setError("");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/payments/admin/pending-reviews`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch pending payments");
            }

            const data = await res.json();
            setPayments(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const handleApprove = async (reference: string) => {
        setProcessingId(reference);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/payments/admin/${reference}/approve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ note: "Approved via admin panel" }),
            });

            if (!res.ok) {
                throw new Error("Failed to approve payment");
            }

            // Remove from list
            setPayments(payments.filter(p => p.reference !== reference));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to approve payment");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (reference: string) => {
        setProcessingId(reference);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/payments/admin/${reference}/reject`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ note: rejectNote[reference] || "Proof of payment rejected" }),
            });

            if (!res.ok) {
                throw new Error("Failed to reject payment");
            }

            // Remove from list
            setPayments(payments.filter(p => p.reference !== reference));
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
                <p className="text-slate-600 mt-2">
                    Review and approve manual bank transfer payments
                </p>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

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
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        {payment.reference}
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        {payment.payer_email || "Unknown email"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Created {formatDistance(new Date(payment.created_at), new Date(), { addSuffix: true })}
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
                                {payment.proof_of_payment_url ? (
                                    <a
                                        href={payment.proof_of_payment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 underline text-sm"
                                    >
                                        📎 View Uploaded Proof
                                    </a>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No proof uploaded yet</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="border-t border-slate-200 pt-4 space-y-3">
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
                                        onChange={(e) => setRejectNote({
                                            ...rejectNote,
                                            [payment.reference]: e.target.value
                                        })}
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
