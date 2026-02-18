"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type TopupResponse = {
  id: string;
  reference: string;
  bubbles_amount: number;
  naira_amount: number;
  status: string;
  paystack_authorization_url?: string | null;
};

// ============================================================================
// Constants
// ============================================================================

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000];
const NAIRA_PER_BUBBLE = 100;
const MIN_BUBBLES = 25;
const MAX_BUBBLES = 5000;

// ============================================================================
// Component
// ============================================================================

export default function TopupPage() {
  const router = useRouter();
  const [walletChecked, setWalletChecked] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ensure user has a wallet before showing topup form
  useEffect(() => {
    apiGet("/api/v1/wallet/me", { auth: true })
      .then(() => setWalletChecked(true))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("not found") || msg.includes("404")) {
          toast.error("Please create a wallet first");
          router.replace("/account/wallet");
        } else {
          // Auth error, network issue, etc. — show form anyway
          toast.error("Could not verify wallet. Please try again.");
          setWalletChecked(true);
        }
      });
  }, [router]);

  const bubbleAmount =
    selectedPreset ?? (customAmount ? parseInt(customAmount, 10) : 0);
  const nairaAmount = bubbleAmount * NAIRA_PER_BUBBLE;
  const isValid = bubbleAmount >= MIN_BUBBLES && bubbleAmount <= MAX_BUBBLES;

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount("");
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    try {
      const result = await apiPost<TopupResponse>(
        "/api/v1/wallet/topup",
        { bubbles_amount: bubbleAmount, payment_method: "paystack" },
        { auth: true },
      );

      if (result.paystack_authorization_url) {
        // Store reference for recovery
        try {
          localStorage.setItem(
            "wallet_topup_pending",
            JSON.stringify({
              reference: result.reference,
              bubbles_amount: result.bubbles_amount,
              saved_at: Date.now(),
            }),
          );
        } catch {
          /* localStorage unavailable */
        }

        // Redirect to Paystack
        window.location.href = result.paystack_authorization_url;
      } else {
        toast.success("Top-up initiated!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to initiate top-up";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!walletChecked) return <LoadingPage />;

  return (
    <div className="space-y-4 md:space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/account/wallet">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add Bubbles</h1>
      </div>

      {/* Preset amounts */}
      <Card className="p-4 md:p-6">
        <p className="text-sm font-medium text-slate-700 mb-3">
          Choose an amount
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handlePresetClick(amount)}
              className={`rounded-lg border-2 p-3 text-center transition-all ${
                selectedPreset === amount
                  ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                  : "border-slate-200 hover:border-cyan-300 text-slate-700"
              }`}
            >
              <span className="block text-lg font-bold">{amount}</span>
              <span className="block text-xs text-slate-500">
                {formatNaira(amount * NAIRA_PER_BUBBLE, { showDecimal: false })}
              </span>
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">
            Or enter a custom amount
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={MIN_BUBBLES}
              max={MAX_BUBBLES}
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder={`${MIN_BUBBLES}–${MAX_BUBBLES.toLocaleString()}`}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-500">Bubbles</span>
          </div>
          {customAmount && !isValid && (
            <p className="text-xs text-red-500 mt-1">
              Amount must be between {MIN_BUBBLES} and{" "}
              {MAX_BUBBLES.toLocaleString()} Bubbles
            </p>
          )}
        </div>
      </Card>

      {/* Summary */}
      {bubbleAmount > 0 && (
        <Card className="p-4 md:p-6 bg-slate-50">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Bubbles</span>
              <span className="font-medium text-slate-900">
                {bubbleAmount.toLocaleString()} 🫧
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Exchange rate</span>
              <span className="text-slate-500">1 🫧 = ₦{NAIRA_PER_BUBBLE}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between">
              <span className="font-medium text-slate-900">Total</span>
              <span className="text-lg font-bold text-slate-900">
                {formatNaira(nairaAmount, { showDecimal: false })}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        disabled={!isValid || submitting}
        onClick={handleSubmit}
      >
        {submitting
          ? "Redirecting to payment..."
          : isValid
            ? `Pay ${formatNaira(nairaAmount, { showDecimal: false })} for ${bubbleAmount.toLocaleString()} Bubbles`
            : "Select an amount"}
      </Button>
    </div>
  );
}
