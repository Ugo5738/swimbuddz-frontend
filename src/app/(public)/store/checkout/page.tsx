"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPost } from "@/lib/api";
import { useStoreCart } from "@/lib/storeCart";
import { ArrowLeft, CreditCard, MapPin, Package, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PickupLocation {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
}

interface StoreCredit {
  id: string;
  balance_ngn: number;
}

interface WalletData {
  balance: number;
  status: string;
}

interface CheckoutResponse {
  order_id: string;
  order_number: string;
  total_ngn: number;
  requires_payment: boolean;
  bubbles_applied: number | null;
  payment_url: string | null;
  payment_reference: string;
}

export default function StoreCheckoutPage() {
  const router = useRouter();
  const {
    cart,
    loading: cartLoading,
    clearCart,
    isAuthenticated,
  } = useStoreCart();

  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [storeCredit, setStoreCredit] = useState<StoreCredit | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: "",
    state: "Lagos",
    phone: "",
  });
  const [customerNotes, setCustomerNotes] = useState("");
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [payWithBubbles, setPayWithBubbles] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [locationsData, creditData, walletData] = await Promise.all([
        apiGet<PickupLocation[]>("/api/v1/store/pickup-locations"),
        apiGet<StoreCredit | null>("/api/v1/store/credits/me", {
          auth: true,
        }).catch(() => null),
        apiGet<WalletData>("/api/v1/wallet/me", { auth: true }).catch(() => null),
      ]);

      setPickupLocations(locationsData);
      if (locationsData.length > 0) {
        setSelectedLocationId(locationsData[0].id);
      }
      setStoreCredit(creditData);
      if (walletData?.status === "active") {
        setWalletBalance(walletData.balance);
      }
    } catch (e) {
      console.error("Failed to load checkout data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated && !cartLoading) {
      router.push("/auth/login?redirect=/store/checkout");
    }
  }, [isAuthenticated, cartLoading, router]);

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (fulfillmentType === "pickup" && !selectedLocationId) {
      toast.error("Please select a pickup location");
      return;
    }

    if (fulfillmentType === "delivery") {
      if (
        !deliveryAddress.street ||
        !deliveryAddress.city ||
        !deliveryAddress.phone
      ) {
        toast.error("Please fill in all delivery fields");
        return;
      }
    }

    setProcessing(true);
    try {
      // Step 1: Create the order
      const checkoutPayload = {
        fulfillment_type: fulfillmentType,
        pickup_location_id:
          fulfillmentType === "pickup" ? selectedLocationId : undefined,
        delivery_address:
          fulfillmentType === "delivery" ? deliveryAddress : undefined,
        customer_notes: customerNotes || undefined,
        apply_store_credit: useStoreCredit,
        pay_with_bubbles: payWithBubbles,
      };

      const orderResult = await apiPost<CheckoutResponse>(
        "/api/v1/store/checkout/start",
        checkoutPayload,
        { auth: true },
      );

      // If bubbles fully covered the order — no Paystack needed
      if (!orderResult.requires_payment || orderResult.total_ngn <= 0) {
        const bubblesMsg = orderResult.bubbles_applied
          ? ` ${orderResult.bubbles_applied} 🫧 Bubbles used.`
          : "";
        toast.success(`Order ${orderResult.order_number} placed!${bubblesMsg}`);
        clearCart();
        router.push(`/account/orders/${orderResult.order_number}`);
        return;
      }

      // Step 2: Remaining balance — create Paystack intent
      const paymentResult = await apiPost<{
        checkout_url: string | null;
        reference: string;
      }>(
        "/api/v1/payments/intents",
        {
          purpose: "STORE_ORDER",
          order_id: orderResult.order_id,
        },
        { auth: true },
      );

      if (paymentResult.checkout_url) {
        clearCart();
        window.location.href = paymentResult.checkout_url;
        return;
      }

      // Fallback: intent created but no URL
      toast.success(`Order ${orderResult.order_number} created!`);
      clearCart();
      router.push(`/account/orders/${orderResult.order_number}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return <LoadingCard text="Redirecting to login..." />;
  }

  if (loading || cartLoading) {
    return <LoadingCard text="Loading checkout..." />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <Alert variant="info" title="Cart is empty">
          Add some items to your cart before checking out.
        </Alert>
        <Link href="/store" className="mt-4 inline-block">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const creditBalance = storeCredit?.balance_ngn || 0;
  const creditToApply = useStoreCredit
    ? Math.min(creditBalance, cart.total_ngn)
    : 0;
  const afterCredit = cart.total_ngn - creditToApply;
  const bubblesNeeded = Math.ceil(afterCredit / 100); // ₦100 = 1 Bubble
  const canPayWithBubbles =
    walletBalance !== null && walletBalance >= bubblesNeeded && afterCredit > 0;
  const bubblesApplied = payWithBubbles && canPayWithBubbles ? bubblesNeeded : 0;
  const finalTotal = Math.max(0, afterCredit - bubblesApplied * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/store/cart"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white mb-4">
          <CreditCard className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fulfillment Type */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              How would you like to receive your order?
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label
                className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                  fulfillmentType === "pickup"
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value="pickup"
                  checked={fulfillmentType === "pickup"}
                  onChange={() => setFulfillmentType("pickup")}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-cyan-600" />
                  <div>
                    <span className="font-medium text-slate-900">
                      Pool Pickup
                    </span>
                    <p className="text-sm text-slate-500">
                      Free • Pick up at a pool session
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                  fulfillmentType === "delivery"
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value="delivery"
                  checked={fulfillmentType === "delivery"}
                  onChange={() => setFulfillmentType("delivery")}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6 text-cyan-600" />
                  <div>
                    <span className="font-medium text-slate-900">
                      Home Delivery
                    </span>
                    <p className="text-sm text-slate-500">
                      Fee may apply • Lagos only
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </Card>

          {/* Pickup Location */}
          {fulfillmentType === "pickup" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-600" />
                Select Pickup Location
              </h2>
              <div className="space-y-3">
                {pickupLocations.map((location) => (
                  <label
                    key={location.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedLocationId === location.id
                        ? "border-cyan-500 bg-cyan-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="location"
                      value={location.id}
                      checked={selectedLocationId === location.id}
                      onChange={() => setSelectedLocationId(location.id)}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium text-slate-900">
                        {location.name}
                      </span>
                      {location.address && (
                        <p className="text-sm text-slate-500">
                          {location.address}
                        </p>
                      )}
                      {location.description && (
                        <p className="text-sm text-slate-500 mt-1">
                          {location.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </Card>
          )}

          {/* Delivery Address */}
          {fulfillmentType === "delivery" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-600" />
                Delivery Address
              </h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) =>
                      setDeliveryAddress((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    placeholder="123 Example Street, Lekki"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.city}
                      onChange={(e) =>
                        setDeliveryAddress((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="Lagos"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={deliveryAddress.phone}
                      onChange={(e) =>
                        setDeliveryAddress((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="08012345678"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card className="p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Order Notes (optional)
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Any special instructions for your order..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
            />
          </Card>

          {/* Payment Method */}
          {afterCredit > 0 && (
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Payment Method</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose how to pay for your order</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Card / Paystack */}
                <div
                  onClick={() => setPayWithBubbles(false)}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    !payWithBubbles
                      ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-300"
                      : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 rounded-lg p-2 ${!payWithBubbles ? "bg-cyan-100" : "bg-slate-100"}`}>
                      <CreditCard className={`w-5 h-5 ${!payWithBubbles ? "text-cyan-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Card Payment</p>
                        {!payWithBubbles && (
                          <span className="text-xs font-medium px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Paystack · Card, bank, USSD</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-900">₦{afterCredit.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">🔒 Secure payment</p>
                </div>

                {/* Bubbles */}
                <div
                  onClick={() => { if (canPayWithBubbles) setPayWithBubbles(true); }}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    payWithBubbles
                      ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-300 cursor-pointer"
                      : canPayWithBubbles
                        ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40 cursor-pointer"
                        : "border-slate-200 bg-white cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 rounded-lg p-2 text-xl leading-none ${payWithBubbles ? "bg-cyan-100" : "bg-slate-100"}`}>
                      🫧
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Pay with Bubbles</p>
                        {payWithBubbles && (
                          <span className="text-xs font-medium px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">SwimBuddz wallet</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xl font-bold text-slate-900">
                    {bubblesNeeded} <span className="text-sm font-normal text-slate-500">Bubbles</span>
                  </p>

                  {walletBalance !== null ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Your balance</span>
                        <span className={`font-semibold ${canPayWithBubbles ? "text-emerald-600" : "text-red-500"}`}>
                          {walletBalance.toLocaleString()} 🫧 {canPayWithBubbles ? "✓" : ""}
                        </span>
                      </div>
                      {!canPayWithBubbles && (
                        <Link
                          href="/account/wallet/topup"
                          className="mt-2 flex items-center justify-center gap-1 w-full text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg py-1.5 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Top Up {bubblesNeeded - walletBalance} more Bubbles →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500">
                        <Link
                          href="/account/wallet"
                          className="text-cyan-600 font-medium underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Set up your wallet
                        </Link>{" "}
                        to pay with Bubbles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Order Summary
            </h2>

            {/* Items */}
            <div className="space-y-2 text-sm pb-4 border-b border-slate-100">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-slate-600 truncate max-w-[180px]">
                    {item.variant?.product?.name} × {item.quantity}
                  </span>
                  <span className="text-slate-900">
                    ₦{(item.unit_price_ngn * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm pt-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-900">
                  ₦{cart.subtotal_ngn.toLocaleString()}
                </span>
              </div>

              {cart.discount_amount_ngn > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-₦{cart.discount_amount_ngn.toLocaleString()}</span>
                </div>
              )}

              {/* Store Credit */}
              {creditBalance > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-600">
                      Use Store Credit (₦{creditBalance.toLocaleString()})
                    </span>
                    <input
                      type="checkbox"
                      checked={useStoreCredit}
                      onChange={(e) => setUseStoreCredit(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
                    />
                  </label>
                  {useStoreCredit && creditToApply > 0 && (
                    <div className="flex justify-between text-emerald-600 mt-2">
                      <span>Credit Applied</span>
                      <span>-₦{creditToApply.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bubbles deduction */}
              {payWithBubbles && bubblesApplied > 0 && (
                <div className="flex justify-between text-cyan-600 font-medium pt-2">
                  <span className="flex items-center gap-1">🫧 {bubblesApplied} Bubbles</span>
                  <span>-₦{(bubblesApplied * 100).toLocaleString()}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-semibold">
                <span className="text-slate-900">Total</span>
                <span className="text-cyan-600">
                  ₦{finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handleCheckout}
              disabled={processing}
              size="lg"
              className="w-full mt-6"
            >
              {processing ? (
                "Processing..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {payWithBubbles && bubblesApplied > 0 ? (
                    <span className="text-lg leading-none">🫧</span>
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  {finalTotal <= 0
                    ? `Pay ${bubblesApplied} Bubbles`
                    : payWithBubbles && bubblesApplied > 0
                      ? `Pay ₦${finalTotal.toLocaleString()} + ${bubblesApplied} 🫧`
                      : `Pay ₦${finalTotal.toLocaleString()}`}
                </span>
              )}
            </Button>

            <p className="mt-4 text-xs text-center text-slate-500">
              {finalTotal <= 0
                ? "🫧 Fully covered by your Bubbles wallet"
                : payWithBubbles && bubblesApplied > 0
                  ? "🫧 Bubbles applied · remaining paid via Paystack"
                  : "🔒 Secure payment via Paystack"}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
