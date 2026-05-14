"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { useEffect, useState } from "react";

interface RefundOwedItem {
  payment_reference: string;
  payment_amount: number;
  payer_email: string | null;
  member_auth_id: string;
  refund_kobo: number;
  refund_naira: number;
  enrollment_id: string;
  window: string;
  reason: string | null;
  annotated_at: string;
  disbursed_at: string | null;
}

interface RefundQueueResponse {
  total_owed_kobo: number;
  total_owed_naira: number;
  item_count: number;
  items: RefundOwedItem[];
}

const WINDOW_LABEL: Record<string, string> = {
  before_start: "Before start (90%)",
  mid_entry_window: "Mid-entry (50% unused)",
  after_cutoff: "After cutoff (0%)",
};

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminRefundsPage() {
  const [queue, setQueue] = useState<RefundQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const fetchQueue = async () => {
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/payments/admin/refunds-owed`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch refund queue");
      const data: RefundQueueResponse = await res.json();
      setQueue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleMarkDisbursed = async (item: RefundOwedItem) => {
    const key = `${item.payment_reference}::${item.enrollment_id}`;
    setProcessingKey(key);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/payments/admin/refunds-owed/${item.payment_reference}/mark-disbursed`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enrollment_id: item.enrollment_id,
            note: notes[key] || undefined,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Mark-disbursed failed");
      }
      await fetchQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mark-disbursed failed");
    } finally {
      setProcessingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Refund Queue
        </h1>
        <p className="text-sm md:text-base text-slate-600">
          Outstanding refund obligations from member withdrawals. Disburse via
          the original payment channel (typically direct bank transfer for
          Paystack-originated payments), then mark disbursed here.
        </p>
      </header>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {loading ? (
        <Card className="p-8 text-center text-slate-500">Loading…</Card>
      ) : !queue || queue.item_count === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          ✅ No outstanding refund obligations.
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Total Owed
                </p>
                <p className="text-2xl font-bold text-amber-900 mt-0.5">
                  {formatNaira(queue.total_owed_naira)}
                </p>
              </div>
              <p className="text-sm text-amber-700">
                {queue.item_count} obligation
                {queue.item_count !== 1 ? "s" : ""}
              </p>
            </div>
          </Card>

          <div className="space-y-3">
            {queue.items.map((item) => {
              const key = `${item.payment_reference}::${item.enrollment_id}`;
              const isProcessing = processingKey === key;
              return (
                <Card key={key} className="p-4 md:p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-slate-700">
                          {item.payment_reference}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {WINDOW_LABEL[item.window] || item.window}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {item.payer_email || "(no email on file)"}
                      </p>
                      <dl className="mt-2 text-xs text-slate-500 space-y-0.5">
                        <div>
                          Annotated{" "}
                          <span className="text-slate-700">
                            {formatDate(item.annotated_at)}
                          </span>
                        </div>
                        <div>
                          Enrollment{" "}
                          <span className="font-mono text-slate-700">
                            {item.enrollment_id}
                          </span>
                        </div>
                        {item.reason && (
                          <div className="mt-1 italic text-slate-600">
                            “{item.reason}”
                          </div>
                        )}
                      </dl>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Refund Owed
                      </p>
                      <p className="text-xl font-bold text-slate-900">
                        {formatNaira(item.refund_naira)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        of {formatNaira(item.payment_amount)} paid
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor={`note-${key}`}
                        className="text-xs text-slate-500 block mb-1"
                      >
                        Disbursement note (optional)
                      </label>
                      <Input
                        id={`note-${key}`}
                        value={notes[key] || ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [key]: e.target.value })
                        }
                        placeholder="e.g. UBA transfer ref ABC123, sent 2026-05-15"
                        disabled={isProcessing}
                      />
                    </div>
                    <Button
                      onClick={() => handleMarkDisbursed(item)}
                      disabled={isProcessing}
                      className="shrink-0"
                    >
                      {isProcessing ? "Marking…" : "Mark Disbursed"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
