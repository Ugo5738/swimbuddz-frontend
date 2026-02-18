"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useStoreCart } from "@/lib/storeCart";
import { ArrowLeft, Minus, Plus, ShoppingBag, Tag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function CartPage() {
  const {
    cart,
    loading,
    updateItem,
    removeItem,
    applyDiscount,
    removeDiscount,
    isAuthenticated,
  } = useStoreCart();

  const [discountInput, setDiscountInput] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;

    setApplyingDiscount(true);
    const result = await applyDiscount(discountInput.trim().toUpperCase());
    if (result.success) {
      toast.success(result.message);
      setDiscountInput("");
    } else {
      toast.error(result.message);
    }
    setApplyingDiscount(false);
  };

  const handleRemoveDiscount = async () => {
    await removeDiscount();
    toast.success("Discount removed");
  };

  if (loading) {
    return <LoadingCard text="Loading cart..." />;
  }

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/store"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Continue Shopping
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>

      {isEmpty ? (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-medium text-slate-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-slate-500 mb-6">
            Browse our products and find something you'll love
          </p>
          <Link href="/store">
            <Button>Start Shopping</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const product = item.variant?.product;
              const primaryImage =
                product?.images?.find((img) => img.is_primary) ||
                product?.images?.[0];

              return (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="relative w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={product?.name || "Product"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {product?.name || "Product"}
                          </h3>
                          {item.variant?.name && (
                            <p className="text-sm text-slate-500">
                              {item.variant.name}
                            </p>
                          )}
                          {item.variant?.options &&
                            Object.keys(item.variant.options).length > 0 && (
                              <p className="text-sm text-slate-500">
                                {Object.entries(item.variant.options)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </p>
                            )}
                        </div>
                        <span className="font-semibold text-slate-900">
                          ₦
                          {(
                            item.unit_price_ngn * item.quantity
                          ).toLocaleString()}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-slate-200 rounded-lg">
                          <button
                            onClick={() =>
                              updateItem(
                                item.id,
                                Math.max(1, item.quantity - 1),
                              )
                            }
                            className="p-2 hover:bg-slate-50 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateItem(item.id, item.quantity + 1)
                            }
                            className="p-2 hover:bg-slate-50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900">
                    ₦{cart?.subtotal_ngn.toLocaleString()}
                  </span>
                </div>

                {cart?.member_discount_percent &&
                  cart.member_discount_percent > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>
                        Member Discount ({cart.member_discount_percent}%)
                      </span>
                      <span>Included</span>
                    </div>
                  )}

                {/* Discount Code */}
                <div className="pt-3 border-t border-slate-100">
                  {cart?.discount_code ? (
                    <div className="flex justify-between text-emerald-600">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {cart.discount_code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          -₦{cart.discount_amount_ngn.toLocaleString()}
                        </span>
                        <button
                          onClick={handleRemoveDiscount}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={discountInput}
                        onChange={(e) =>
                          setDiscountInput(e.target.value.toUpperCase())
                        }
                        placeholder="Discount code"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleApplyDiscount}
                        disabled={!discountInput.trim() || applyingDiscount}
                      >
                        {applyingDiscount ? "..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-semibold">
                  <span className="text-slate-900">Total</span>
                  <span className="text-cyan-600">
                    ₦{cart?.total_ngn.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <div className="mt-6 space-y-3">
                {isAuthenticated ? (
                  <Link href="/store/checkout" className="block">
                    <Button size="lg" className="w-full">
                      Proceed to Checkout
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/login?redirect=/store/checkout"
                      className="block"
                    >
                      <Button size="lg" className="w-full">
                        Login to Checkout
                      </Button>
                    </Link>
                    <p className="text-xs text-center text-slate-500">
                      Login to get your member discount and complete your order
                    </p>
                  </>
                )}
              </div>

              {/* Trust badges */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center space-y-1">
                <p>🔒 Secure checkout via Paystack</p>
                <p>📦 Pool pickup available at checkout</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
