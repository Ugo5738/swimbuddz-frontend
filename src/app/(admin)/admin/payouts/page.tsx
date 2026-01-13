"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { StatsCard } from "@/components/ui/StatsCard";
import { formatDate, formatNaira } from "@/lib/format";
import {
    adminApprovePayout,
    adminCompleteManual,
    adminFailPayout,
    adminGetPayoutSummary,
    adminInitiateTransfer,
    adminListPayouts,
    type Payout,
    type PayoutStatus,
    type PayoutSummary,
} from "@/lib/payouts";
import {
    ArrowRight,
    Banknote,
    CheckCircle,
    Clock,
    DollarSign,
    Loader2,
    Send,
    XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<PayoutStatus, { variant: "success" | "warning" | "info" | "danger" | "default"; icon: typeof CheckCircle; label: string }> = {
    pending: { variant: "warning", icon: Clock, label: "Pending" },
    approved: { variant: "info", icon: ArrowRight, label: "Approved" },
    processing: { variant: "info", icon: Loader2, label: "Processing" },
    paid: { variant: "success", icon: CheckCircle, label: "Paid" },
    failed: { variant: "danger", icon: XCircle, label: "Failed" },
};

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [summary, setSummary] = useState<PayoutSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<PayoutStatus | "">("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    const loadData = async () => {
        setLoading(true);
        try {
            const [payoutsResponse, summaryResponse] = await Promise.all([
                adminListPayouts({
                    status: statusFilter || undefined,
                    page,
                    page_size: pageSize,
                }),
                adminGetPayoutSummary(),
            ]);
            setPayouts(payoutsResponse.items);
            setTotal(payoutsResponse.total);
            setSummary(summaryResponse);
        } catch (err) {
            console.error("Failed to load payouts", err);
            toast.error("Failed to load payouts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [statusFilter, page]);

    const handleApprove = async (payout: Payout) => {
        if (!confirm(`Approve payout of ${formatNaira(payout.total_amount / 100)} for ${payout.period_label}?`)) {
            return;
        }
        try {
            await adminApprovePayout(payout.id);
            toast.success("Payout approved");
            loadData();
        } catch (err) {
            toast.error("Failed to approve payout");
        }
    };

    const handleInitiateTransfer = async (payout: Payout) => {
        if (!confirm(`Initiate Paystack transfer of ${formatNaira(payout.total_amount / 100)}?`)) {
            return;
        }
        try {
            await adminInitiateTransfer(payout.id);
            toast.success("Transfer initiated! Paystack will process shortly.");
            loadData();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Transfer failed";
            toast.error(msg);
        }
    };

    const handleMarkManualPaid = async (payout: Payout) => {
        const reference = prompt("Enter bank transfer reference:");
        if (!reference) return;

        try {
            await adminCompleteManual(payout.id, {
                payout_method: "bank_transfer",
                payment_reference: reference,
            });
            toast.success("Payout marked as paid");
            loadData();
        } catch (err) {
            toast.error("Failed to mark as paid");
        }
    };

    const handleMarkFailed = async (payout: Payout) => {
        const reason = prompt("Enter failure reason:");
        if (!reason) return;

        try {
            await adminFailPayout(payout.id, reason);
            toast.success("Payout marked as failed");
            loadData();
        } catch (err) {
            toast.error("Failed to update payout");
        }
    };

    if (loading && payouts.length === 0) {
        return <LoadingCard text="Loading payouts..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Coach Payouts</h1>
                <p className="text-slate-600 mt-1">
                    Manage coach payouts and process transfers.
                </p>
            </div>

            {/* Summary Stats */}
            {summary && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        label="Pending"
                        value={summary.total_pending}
                        icon={<Clock className="h-5 w-5" />}
                        color="amber"
                        variant="elaborate"
                    />
                    <StatsCard
                        label="Approved"
                        value={summary.total_approved}
                        icon={<ArrowRight className="h-5 w-5" />}
                        color="cyan"
                        variant="elaborate"
                    />
                    <StatsCard
                        label="Paid"
                        value={summary.total_paid}
                        icon={<CheckCircle className="h-5 w-5" />}
                        color="green"
                        variant="elaborate"
                    />
                    <StatsCard
                        label="Failed"
                        value={summary.total_failed}
                        icon={<XCircle className="h-5 w-5" />}
                        color="slate"
                        variant="elaborate"
                    />
                </div>
            )}

            {/* Amount Totals */}
            {summary && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="p-4 bg-amber-50 border-amber-200">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-6 w-6 text-amber-600" />
                            <div>
                                <p className="text-sm text-amber-800">Pending Amount</p>
                                <p className="text-xl font-bold text-amber-900">
                                    {formatNaira(summary.pending_amount / 100)}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-emerald-50 border-emerald-200">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                            <div>
                                <p className="text-sm text-emerald-800">Total Paid</p>
                                <p className="text-xl font-bold text-emerald-900">
                                    {formatNaira(summary.paid_amount / 100)}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Status Filter
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as PayoutStatus | "");
                                setPage(1);
                            }}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="processing">Processing</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div className="flex-1" />
                    <Button onClick={loadData} variant="outline" size="sm">
                        Refresh
                    </Button>
                </div>
            </Card>

            {/* Payouts Table */}
            <Card>
                {payouts.length === 0 ? (
                    <div className="p-8 text-center">
                        <DollarSign className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-700">No payouts found</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {statusFilter ? "Try a different filter" : "No payouts have been created yet"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-left text-sm text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Period</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Details</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payouts.map((payout) => (
                                    <PayoutRow
                                        key={payout.id}
                                        payout={payout}
                                        onApprove={() => handleApprove(payout)}
                                        onInitiateTransfer={() => handleInitiateTransfer(payout)}
                                        onMarkManualPaid={() => handleMarkManualPaid(payout)}
                                        onMarkFailed={() => handleMarkFailed(payout)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Pagination */}
            {total > pageSize && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-slate-600">
                        Page {page} of {Math.ceil(total / pageSize)}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page * pageSize >= total}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}

function PayoutRow({
    payout,
    onApprove,
    onInitiateTransfer,
    onMarkManualPaid,
    onMarkFailed,
}: {
    payout: Payout;
    onApprove: () => void;
    onInitiateTransfer: () => void;
    onMarkManualPaid: () => void;
    onMarkFailed: () => void;
}) {
    const config = statusConfig[payout.status];
    const StatusIcon = config.icon;

    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3">
                <div>
                    <p className="font-medium text-slate-900">{payout.period_label}</p>
                    <p className="text-xs text-slate-500">
                        {formatDate(payout.period_start, { includeYear: false })} -{" "}
                        {formatDate(payout.period_end, { includeYear: false })}
                    </p>
                </div>
            </td>
            <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">
                    {formatNaira(payout.total_amount / 100)}
                </p>
                <div className="text-xs text-slate-500">
                    {payout.academy_earnings > 0 && <span>A: {formatNaira(payout.academy_earnings / 100)} </span>}
                    {payout.session_earnings > 0 && <span>S: {formatNaira(payout.session_earnings / 100)} </span>}
                </div>
            </td>
            <td className="px-4 py-3">
                <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                    <StatusIcon className={`h-3 w-3 ${payout.status === "processing" ? "animate-spin" : ""}`} />
                    {config.label}
                </Badge>
                {payout.status === "failed" && payout.failure_reason && (
                    <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={payout.failure_reason}>
                        {payout.failure_reason}
                    </p>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-slate-600">
                {payout.paid_at && (
                    <p className="text-xs text-emerald-600">
                        Paid: {formatDate(payout.paid_at, { includeYear: true })}
                    </p>
                )}
                {payout.payment_reference && (
                    <p className="text-xs text-slate-500">
                        Ref: {payout.payment_reference}
                    </p>
                )}
                {payout.payout_method && (
                    <p className="text-xs text-slate-500">
                        Via: {payout.payout_method.replace("_", " ")}
                    </p>
                )}
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                    {payout.status === "pending" && (
                        <>
                            <Button size="sm" variant="secondary" onClick={onApprove}>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={onMarkFailed} className="text-red-600">
                                <XCircle className="h-3 w-3" />
                            </Button>
                        </>
                    )}
                    {(payout.status === "approved" || payout.status === "failed") && (
                        <>
                            <Button size="sm" onClick={onInitiateTransfer} title="Paystack Transfer">
                                <Send className="h-3 w-3 mr-1" />
                                Send
                            </Button>
                            <Button size="sm" variant="secondary" onClick={onMarkManualPaid} title="Manual Bank Transfer">
                                <Banknote className="h-3 w-3 mr-1" />
                                Manual
                            </Button>
                        </>
                    )}
                    {payout.status === "processing" && (
                        <span className="text-xs text-slate-500 px-2">Processing...</span>
                    )}
                    {payout.status === "paid" && (
                        <span className="text-xs text-emerald-600 px-2">✓ Complete</span>
                    )}
                </div>
            </td>
        </tr>
    );
}
