"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiPost } from "@/lib/api";
import {
  formatKobo,
  refundStatusMeta,
  type AdminRefundListResponse,
  type AdminRefundRecord,
  type NigerianBankOption,
} from "@/lib/storeOrderLifecycle";
import { Building2, CheckCircle2, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AdminRefundsPanel() {
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Manual bank verification & completion modals
  const [verifyTarget, setVerifyTarget] = useState<AdminRefundRecord | null>(null);
  const [banks, setBanks] = useState<NigerianBankOption[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [completeTarget, setCompleteTarget] = useState<AdminRefundRecord | null>(null);
  const [bankRef, setBankRef] = useState("");
  const [completeNote, setCompleteNote] = useState("");

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (sourceFilter) params.set("source_service", sourceFilter);
  params.set("page_size", "50");

  const { data, loading, error, refetch } = useApi<AdminRefundListResponse>(
    `/api/v1/payments/admin/refunds?${params.toString()}`
  );
  const refunds = data?.items ?? [];

  const handleApprove = async (refund: AdminRefundRecord, autoPaystack: boolean) => {
    setBusyId(refund.id);
    try {
      await apiPost(
        `/api/v1/payments/admin/refunds/${refund.id}/approve`,
        { auto_initiate_paystack: autoPaystack },
        { auth: true }
      );
      toast.success(`Refund ${refund.refund_reference} approved`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve refund");
    } finally {
      setBusyId(null);
    }
  };

  const handleInitiatePaystack = async (refund: AdminRefundRecord) => {
    setBusyId(refund.id);
    try {
      await apiPost(
        `/api/v1/payments/admin/refunds/${refund.id}/initiate-paystack`,
        {},
        { auth: true }
      );
      toast.success(`Paystack refund initiated for ${refund.refund_reference}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paystack refund failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleSyncPaystack = async (refund: AdminRefundRecord) => {
    setBusyId(refund.id);
    try {
      await apiPost(
        `/api/v1/payments/admin/refunds/${refund.id}/sync-paystack`,
        {},
        { auth: true }
      );
      toast.success(`Synced Paystack status for ${refund.refund_reference}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync Paystack status");
    } finally {
      setBusyId(null);
    }
  };

  const openVerifyModal = async (refund: AdminRefundRecord) => {
    setVerifyTarget(refund);
    setBankCode(refund.recipient_bank_code || "");
    setAccountNumber(refund.recipient_account_number || "");
    if (banks.length === 0) {
      try {
        const list = await apiGet<NigerianBankOption[]>("/api/v1/payments/admin/refunds/banks", {
          auth: true,
        });
        setBanks(list);
      } catch {
        toast.error("Could not load Nigerian banks list");
      }
    }
  };

  const submitVerifyBank = async () => {
    if (!verifyTarget || !bankCode || accountNumber.length !== 10) {
      toast.error("Select a bank and enter a 10-digit NUBAN account number.");
      return;
    }
    setBusyId(verifyTarget.id);
    try {
      const bankObj = banks.find((b) => b.code === bankCode);
      const updated = await apiPost<AdminRefundRecord>(
        `/api/v1/payments/admin/refunds/${verifyTarget.id}/verify-bank-account`,
        {
          bank_code: bankCode,
          bank_name: bankObj?.name,
          account_number: accountNumber,
        },
        { auth: true }
      );
      toast.success(`Verified: ${updated.recipient_account_name}`);
      setVerifyTarget(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "NUBAN verification failed");
    } finally {
      setBusyId(null);
    }
  };

  const submitCompleteManual = async () => {
    if (!completeTarget || bankRef.trim().length < 3) {
      toast.error("Enter the verified Stanbic / bank transaction reference.");
      return;
    }
    setBusyId(completeTarget.id);
    try {
      await apiPost(
        `/api/v1/payments/admin/refunds/${completeTarget.id}/complete-manual`,
        {
          external_bank_reference: bankRef.trim(),
          admin_note: completeNote.trim() || undefined,
        },
        { auth: true }
      );
      toast.success(`Refund ${completeTarget.refund_reference} marked completed`);
      setCompleteTarget(null);
      setBankRef("");
      setCompleteNote("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete refund");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Pending Cash Refunds</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {formatKobo(data?.pending_cash_kobo ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">In-Flight Paystack</p>
          <p className="text-2xl font-bold text-cyan-700 mt-1">
            {formatKobo(data?.initiated_cash_kobo ?? 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Completed Cash Refunds</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {formatKobo(data?.completed_cash_kobo ?? 0)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="initiated">Initiated (Paystack)</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Domains</option>
          <option value="store">Store</option>
          <option value="academy">Academy</option>
          <option value="club">Club</option>
          <option value="sessions">Sessions</option>
        </select>
        <Button variant="secondary" size="sm" onClick={() => refetch()} className="ml-auto">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <Card className="p-8 text-center text-slate-500">Loading refunds...</Card>
      ) : refunds.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No refund records match the current filters.
        </Card>
      ) : (
        <div className="space-y-4">
          {refunds.map((r) => {
            const st = refundStatusMeta(r.status);
            const isPaystack = r.provider === "paystack";
            return (
              <Card key={r.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{r.refund_reference}</span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 uppercase">
                        {r.source_service}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {r.payer_email || r.member_auth_id}
                      {r.payment_reference && ` • Payment: ${r.payment_reference}`}
                      {r.provider && ` • Channel: ${r.provider}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {formatKobo(r.cash_refund_kobo)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.bubbles_refund > 0 && `+ ${r.bubbles_refund} 🫧 `}
                      {r.store_credit_refund_kobo > 0 &&
                        `+ Credit ${formatKobo(r.store_credit_refund_kobo)}`}
                    </p>
                  </div>
                </div>

                {r.reason && <p className="text-sm text-slate-700">{r.reason}</p>}

                {r.failure_reason && (
                  <Alert variant="error" title="Refund issue">
                    {r.failure_reason}
                  </Alert>
                )}

                {r.recipient_account_number && (
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-wrap items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>
                      {r.recipient_bank_name || r.recipient_bank_code} —{" "}
                      <strong>{r.recipient_account_number}</strong> (
                      {r.recipient_account_name || "Unverified"})
                    </span>
                    {r.recipient_account_verified && (
                      <span className="text-emerald-700 font-semibold">✓ Verified NUBAN</span>
                    )}
                  </div>
                )}

                {r.external_bank_reference && (
                  <p className="text-xs text-emerald-700">
                    Bank Ref: <strong>{r.external_bank_reference}</strong>
                  </p>
                )}
                {r.provider_refund_id && (
                  <p className="text-xs text-cyan-700">
                    Paystack Refund ID: <strong>{r.provider_refund_id}</strong> ({r.provider_status})
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status === "requested" && (
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => handleApprove(r, isPaystack)}
                    >
                      Approve{isPaystack ? " & Initiate Paystack" : ""}
                    </Button>
                  )}

                  {isPaystack &&
                    r.cash_refund_kobo > 0 &&
                    (r.status === "approved" || r.status === "failed") && (
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => handleInitiatePaystack(r)}
                      >
                        <Send className="w-4 h-4 mr-1.5" />
                        Initiate Paystack Refund
                      </Button>
                    )}

                  {isPaystack && r.provider_refund_id && r.status === "initiated" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => handleSyncPaystack(r)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1.5" />
                      Sync Paystack Status
                    </Button>
                  )}

                  {r.cash_refund_kobo > 0 &&
                    (r.status === "approved" || r.status === "failed") && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => openVerifyModal(r)}
                        >
                          <Building2 className="w-4 h-4 mr-1.5" />
                          Verify Bank Account
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          disabled={busyId === r.id}
                          onClick={() => {
                            setCompleteTarget(r);
                            setBankRef("");
                            setCompleteNote("");
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Mark Bank Transfer Completed
                        </Button>
                      </>
                    )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Verify Recipient Bank Account Modal */}
      <Modal
        isOpen={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        title="Verify Recipient Bank Account (Paystack NUBAN)"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Select Nigerian Bank...</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="10-Digit Account Number (NUBAN)"
            value={accountNumber}
            maxLength={10}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setVerifyTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitVerifyBank} disabled={busyId === verifyTarget?.id}>
              Verify Account Name
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Manual Bank Refund Modal */}
      <Modal
        isOpen={!!completeTarget}
        onClose={() => setCompleteTarget(null)}
        title={`Complete Bank Transfer Refund — ${completeTarget?.refund_reference ?? ""}`}
      >
        <div className="space-y-4">
          <Alert variant="info">
            Confirm you have sent{" "}
            <strong>{formatKobo(completeTarget?.cash_refund_kobo ?? 0)}</strong> from Stanbic IBTC
            (SWIMBUDDZ LIMITED, 0079760600) and record the verified bank transaction reference.
          </Alert>
          <Input
            label="Verified Bank Transaction Reference"
            value={bankRef}
            onChange={(e) => setBankRef(e.target.value)}
            required
            placeholder="e.g., NIP-20261125-004921"
          />
          <Input
            label="Disbursement Note (optional)"
            value={completeNote}
            onChange={(e) => setCompleteNote(e.target.value)}
            placeholder="Transferred to verified account"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCompleteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitCompleteManual} disabled={busyId === completeTarget?.id}>
              Confirm Refund Completed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
