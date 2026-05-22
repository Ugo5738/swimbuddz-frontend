"use client";

import { apiGet, apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { PaymentRecord, WalletSummary } from "../types";

type Params = {
  providerReference: string | null;
  isPaystackReturn: boolean;
  isTopupReference: boolean;
  onPaymentVerified: () => Promise<void> | void;
};

type Result = {
  returnedPayment: PaymentRecord | null;
  verifying: boolean;
  verificationError: string | null;
  verificationTimedOut: boolean;
  walletSummary: WalletSummary | null;
};

export function usePaystackReturn({
  providerReference,
  isPaystackReturn,
  isTopupReference,
  onPaymentVerified,
}: Params): Result {
  const router = useRouter();

  const [returnedPayment, setReturnedPayment] = useState<PaymentRecord | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationTimedOut, setVerificationTimedOut] = useState(false);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);

  // Load returned payment if coming from Paystack
  useEffect(() => {
    if (!providerReference || !isPaystackReturn) return;
    const fetchPayment = async () => {
      try {
        const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true });
        const match = payments.find((p) => p.reference === providerReference);
        setReturnedPayment(match || null);
      } catch {
        // If we can't fetch payments, still try to verify
        setReturnedPayment(null);
      }
    };
    fetchPayment();
  }, [isPaystackReturn, providerReference]);

  // Wallet topups use TOP-* references and should return to wallet, not billing.
  useEffect(() => {
    if (!providerReference || !isTopupReference) return;
    router.replace(
      `/account/wallet?provider=paystack&reference=${encodeURIComponent(providerReference)}`,
    );
  }, [isTopupReference, providerReference, router]);

  // Timeout for verification - after 30 seconds, stop showing loading
  useEffect(() => {
    if (!isPaystackReturn) return;
    const timeout = setTimeout(() => {
      setVerificationTimedOut(true);
    }, 30000);
    return () => clearTimeout(timeout);
  }, [isPaystackReturn]);

  // Auto-verify payment on return
  useEffect(() => {
    if (!providerReference || verifying || verificationError) return;
    if (returnedPayment?.status === "paid" && returnedPayment.entitlement_applied_at) return;

    const verify = async () => {
      setVerifying(true);
      try {
        await apiPost(
          `/api/v1/payments/paystack/verify/${encodeURIComponent(providerReference)}`,
          undefined,
          { auth: true },
        );
        toast.success("Payment verified!");
        setVerificationError(null);
        await onPaymentVerified();
        // Re-fetch payment to get updated status
        const payments = await apiGet<PaymentRecord[]>("/api/v1/payments/me", { auth: true });
        const match = payments.find((p) => p.reference === providerReference);
        setReturnedPayment(match || null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Verification failed";
        setVerificationError(message);
        toast.error(message);
      } finally {
        setVerifying(false);
      }
    };
    const timer = setTimeout(verify, 1000);
    return () => clearTimeout(timer);
  }, [providerReference, returnedPayment, verifying, verificationError, onPaymentVerified]);

  // Load wallet summary after a successful membership payment so the success
  // banner can show the welcome bonus + balance.
  useEffect(() => {
    const loadWalletSummary = async () => {
      if (!isPaystackReturn || !returnedPayment) return;
      if (returnedPayment.status !== "paid" || !returnedPayment.entitlement_applied_at) return;

      const purpose = (
        returnedPayment.purpose ||
        returnedPayment.payment_metadata?.purpose ||
        ""
      ).toLowerCase();
      const membershipPurpose =
        purpose === "community" || purpose === "club" || purpose === "club_bundle";
      if (!membershipPurpose) return;

      try {
        const [walletData, txnData] = await Promise.all([
          apiGet<{ balance: number }>("/api/v1/wallet/me", { auth: true }),
          apiGet<{
            transactions: Array<{
              transaction_type: string;
              amount: number;
              created_at: string;
            }>;
          }>("/api/v1/wallet/transactions?limit=20", { auth: true }),
        ]);

        const anchorTs = new Date(
          returnedPayment.entitlement_applied_at ||
            returnedPayment.paid_at ||
            returnedPayment.created_at,
        ).getTime();
        const recentWelcomeBonus = (txnData.transactions || []).find((txn) => {
          if (txn.transaction_type !== "welcome_bonus") return false;
          const createdAtTs = new Date(txn.created_at).getTime();
          if (Number.isNaN(anchorTs) || Number.isNaN(createdAtTs)) return false;
          return Math.abs(createdAtTs - anchorTs) <= 30 * 60 * 1000;
        });

        const summary: WalletSummary = {
          balance: walletData.balance || 0,
          welcomeBonusGranted: Boolean(recentWelcomeBonus),
          welcomeBonusAmount: recentWelcomeBonus?.amount || 0,
        };
        setWalletSummary(summary);

        try {
          localStorage.setItem(
            "wallet_intro_pending",
            JSON.stringify({
              created_at: Date.now(),
              welcome_bonus_granted: summary.welcomeBonusGranted,
              welcome_bonus_amount: summary.welcomeBonusAmount,
              balance: summary.balance,
            }),
          );
        } catch {
          // localStorage may be unavailable
        }
      } catch {
        setWalletSummary(null);
      }
    };

    loadWalletSummary();
  }, [isPaystackReturn, returnedPayment]);

  return {
    returnedPayment,
    verifying,
    verificationError,
    verificationTimedOut,
    walletSummary,
  };
}
