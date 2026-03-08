"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import { AlertTriangle, ArrowLeft, Package, RefreshCw, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface CleanupResult {
  expired_carts: number;
  reservations_released: number;
  stale_orders_failed: number;
  message: string;
}

export default function StoreMaintenancePage() {
  const [expireMinutes, setExpireMinutes] = useState(30);
  const [staleOrderHours, setStaleOrderHours] = useState(24);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);

  const runCleanup = async () => {
    const confirmed = confirm(
      "This will expire stale carts, release held inventory, and fail stale orders. Continue?"
    );
    if (!confirmed) return;

    setRunning(true);
    setResult(null);
    try {
      const data = await apiPost<CleanupResult>(
        `/api/v1/admin/store/maintenance/cleanup?expire_minutes=${expireMinutes}&stale_order_hours=${staleOrderHours}`,
        undefined,
        { auth: true }
      );
      setResult(data);
      toast.success("Cleanup completed");
    } catch (e) {
      console.error("Cleanup failed:", e);
      toast.error(e instanceof Error ? e.message : "Cleanup failed. Check logs.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/store"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Store Maintenance</h1>
        <p className="text-slate-500">
          Run cleanup tasks to expire stale carts, release inventory, and fail stale orders.
        </p>
      </div>

      {/* Configuration */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="expire-minutes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Cart expiry minutes
            </label>
            <input
              id="expire-minutes"
              type="number"
              min={1}
              value={expireMinutes}
              onChange={(e) => setExpireMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">
              Carts idle longer than this will be expired.
            </p>
          </div>
          <div>
            <label
              htmlFor="stale-order-hours"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Stale order hours
            </label>
            <input
              id="stale-order-hours"
              type="number"
              min={1}
              value={staleOrderHours}
              onChange={(e) => setStaleOrderHours(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400 mt-1">
              Unpaid orders older than this will be marked as failed.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="danger" onClick={runCleanup} disabled={running} className="gap-2">
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Run Cleanup
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{result.expired_carts}</p>
                <p className="text-sm text-slate-500">Carts expired</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Package className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{result.reservations_released}</p>
                <p className="text-sm text-slate-500">Reservations released</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <AlertTriangle className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{result.stale_orders_failed}</p>
                <p className="text-sm text-slate-500">Orders failed</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-600">{result.message}</p>
        </Card>
      )}
    </div>
  );
}
