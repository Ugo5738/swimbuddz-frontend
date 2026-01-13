"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { formatDate, formatNaira } from "@/lib/format";
import { getMyPayouts, type Payout, type PayoutStatus } from "@/lib/payouts";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    Clock,
    DollarSign,
    Loader2,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const statusConfig: Record<PayoutStatus, { variant: "success" | "warning" | "info" | "danger" | "default"; icon: typeof CheckCircle; label: string }> = {
    pending: { variant: "warning", icon: Clock, label: "Pending" },
    approved: { variant: "info", icon: ArrowRight, label: "Approved" },
    processing: { variant: "info", icon: Loader2, label: "Processing" },
    paid: { variant: "success", icon: CheckCircle, label: "Paid" },
    failed: { variant: "danger", icon: XCircle, label: "Failed" },
};

export default function PayoutsPage() {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        setLoading(true);
        getMyPayouts({ page, page_size: pageSize })
            .then((response) => {
                setPayouts(response.items);
                setTotal(response.total);
            })
            .catch((err) => {
                console.error("Failed to load payouts", err);
                toast.error("Failed to load payout history");
            })
            .finally(() => setLoading(false));
    }, [page]);

    // Calculate totals
    const paidTotal = payouts
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.total_amount, 0);
    const pendingTotal = payouts
        .filter((p) => p.status === "pending" || p.status === "approved")
        .reduce((sum, p) => sum + p.total_amount, 0);

    if (loading && payouts.length === 0) {
        return <LoadingCard text="Loading payout history..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payout History</h1>
                    <p className="text-slate-600 mt-1">View your earnings and payout status.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/coach/bank-account">
                        <Button variant="outline" size="sm">
                            Bank Account
                        </Button>
                    </Link>
                    <Link href="/coach/dashboard">
                        <Button variant="outline" size="sm">
                            Dashboard
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Paid</p>
                            <p className="text-xl font-bold text-emerald-600">
                                {formatNaira(paidTotal / 100)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Pending Payouts</p>
                            <p className="text-xl font-bold text-amber-600">
                                {formatNaira(pendingTotal / 100)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-100">
                            <CheckCircle className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Payouts</p>
                            <p className="text-xl font-bold text-cyan-600">{total}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Payouts List */}
            <Card>
                {payouts.length === 0 ? (
                    <div className="p-8 text-center">
                        <DollarSign className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-700">No payouts yet</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Payouts will appear here once you complete teaching periods.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {payouts.map((payout) => (
                            <PayoutRow key={payout.id} payout={payout} />
                        ))}
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

function PayoutRow({ payout }: { payout: Payout }) {
    const config = statusConfig[payout.status];
    const StatusIcon = config.icon;

    return (
        <div className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                            {payout.period_label}
                        </span>
                        <Badge variant={config.variant} className="flex items-center gap-1">
                            <StatusIcon
                                className={`h-3 w-3 ${payout.status === "processing" ? "animate-spin" : ""}`}
                            />
                            {config.label}
                        </Badge>
                    </div>

                    <p className="text-sm text-slate-500">
                        {formatDate(payout.period_start, { includeYear: true })} -{" "}
                        {formatDate(payout.period_end, { includeYear: true })}
                    </p>

                    {/* Earnings breakdown */}
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        {payout.academy_earnings > 0 && (
                            <span>Academy: {formatNaira(payout.academy_earnings / 100)}</span>
                        )}
                        {payout.session_earnings > 0 && (
                            <span>Sessions: {formatNaira(payout.session_earnings / 100)}</span>
                        )}
                        {payout.other_earnings > 0 && (
                            <span>Other: {formatNaira(payout.other_earnings / 100)}</span>
                        )}
                    </div>

                    {payout.status === "failed" && payout.failure_reason && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            {payout.failure_reason}
                        </div>
                    )}

                    {payout.status === "paid" && payout.paid_at && (
                        <p className="text-xs text-emerald-600 mt-1">
                            Paid on {formatDate(payout.paid_at, { includeYear: true, includeTime: true })}
                        </p>
                    )}
                </div>

                <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                        {formatNaira(payout.total_amount / 100)}
                    </p>
                    <p className="text-xs text-slate-500">{payout.currency}</p>
                </div>
            </div>
        </div>
    );
}
