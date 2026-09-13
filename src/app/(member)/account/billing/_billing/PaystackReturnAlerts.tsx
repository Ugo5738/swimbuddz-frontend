import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

import type { PaymentRecord, WalletSummary } from "../types";

type Props = {
  isPaystackReturn: boolean;
  verificationError: string | null;
  verificationTimedOut: boolean;
  returnedPayment: PaymentRecord | null;
  walletSummary: WalletSummary | null;
  isSessionPayment: boolean;
  isAcademyPayment: boolean;
  isClubPayment: boolean;
  isMembershipPayment: boolean;
};

export function PaystackReturnAlerts({
  isPaystackReturn,
  verificationError,
  verificationTimedOut,
  returnedPayment,
  walletSummary,
  isSessionPayment,
  isAcademyPayment,
  isClubPayment,
  isMembershipPayment,
}: Props) {
  if (!isPaystackReturn) return null;

  const showSuccessBanner =
    returnedPayment?.status === "paid" && Boolean(returnedPayment.entitlement_applied_at);

  let successTitle = "Welcome to Community! 🎉";
  let successDescription =
    "Your membership has been activated. You now have full access to member features.";
  if (isSessionPayment) {
    successTitle = "Session Confirmed! ✓";
    successDescription =
      "Your attendance has been recorded. You'll receive a confirmation email with session details and your e-card.";
  } else if (isClubPayment) {
    successTitle = "Club is now active! 🎉";
    successDescription = "You can now book sessions and access all Club features.";
  } else if (isAcademyPayment) {
    successTitle = "Academy enrollment confirmed! 🎉";
    successDescription = "You're enrolled! Check your email for cohort details and next steps.";
  }

  return (
    <>
      {/* Verification Error Alert */}
      {verificationError && (
        <Alert variant="error" title="Payment verification issue">
          {verificationError}. Your payment may still have been processed. Please check your email
          or contact support if the issue persists.
        </Alert>
      )}

      {/* Verification Timeout Alert */}
      {verificationTimedOut && !returnedPayment?.entitlement_applied_at && (
        <Alert variant="info" title="Verification taking longer than expected">
          Payment verification is still processing.{" "}
          {isSessionPayment
            ? "Your session confirmation will be completed automatically once done."
            : isAcademyPayment
              ? "Your enrollment confirmation will be completed automatically once done."
              : "Your membership will be activated automatically once complete."}{" "}
          You can refresh this page to check status.
        </Alert>
      )}

      {/* Success Banner */}
      {showSuccessBanner && (
        <Alert variant="success" title={successTitle}>
          <div className="space-y-2">
            <p>{successDescription}</p>
            {returnedPayment?.payment_metadata?.checkout_quote &&
              (() => {
                const receipt = returnedPayment.payment_metadata.checkout_quote;
                const money = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;
                return (
                  <div className="text-sm" aria-label="Payment breakdown">
                    <p>Original price: {money(receipt.subtotal_kobo)}</p>
                    {receipt.discount_kobo > 0 && <p>Discount: −{money(receipt.discount_kobo)}</p>}
                    {receipt.bubbles_to_apply > 0 && (
                      <p>Paid with Bubbles: {receipt.bubbles_to_apply}</p>
                    )}
                    <p>
                      Paid in cash: {money(receipt.total_kobo)}
                      {receipt.additional_charges_total_kobo > 0
                        ? ` (includes ${money(receipt.additional_charges_total_kobo)} processing charges)`
                        : ""}
                    </p>
                    <p>Reference: {returnedPayment.reference}</p>
                  </div>
                );
              })()}
            {isMembershipPayment && (
              <p>
                {walletSummary?.welcomeBonusGranted
                  ? `Welcome bonus added: +${walletSummary.welcomeBonusAmount} Bubbles.`
                  : "Your Bubble wallet is active. Welcome bonus is granted on first paid activation only."}{" "}
                {walletSummary
                  ? `Current balance: ${walletSummary.balance.toLocaleString()} Bubbles.`
                  : ""}
              </p>
            )}
            {isMembershipPayment && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/account/wallet?welcome=1">
                  <Button size="sm">Go to Wallet</Button>
                </Link>
                <Link href="/account/wallet/topup">
                  <Button size="sm" variant="outline">
                    Add Bubbles
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Alert>
      )}

      {/* Error Banner */}
      {returnedPayment?.entitlement_error && (
        <Alert variant="error" title="Payment issue">
          Payment confirmed but activation failed: {returnedPayment.entitlement_error}
        </Alert>
      )}
    </>
  );
}
