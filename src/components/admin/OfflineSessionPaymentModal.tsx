"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ReceiptText } from "lucide-react";
import { type FormEvent, useState } from "react";
import { uploadMedia } from "@/lib/media";

export type OfflineSessionPaymentInput = {
  payment_method: "bank_transfer" | "cash" | "pos" | "other";
  received_at: string;
  external_reference: string | null;
  note: string | null;
  proof_media_id?: string;
};

function currentLocalDateTime(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function OfflineSessionPaymentModal({
  memberName,
  amountNaira,
  submitting,
  error,
  onClose,
  onSubmit,
  paymentLabel = "Session fee",
  noteRequired = false,
  currency = "NGN",
}: {
  memberName: string;
  amountNaira: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: OfflineSessionPaymentInput) => Promise<void> | void;
  paymentLabel?: string;
  noteRequired?: boolean;
  currency?: string;
}) {
  const [method, setMethod] =
    useState<OfflineSessionPaymentInput["payment_method"]>("bank_transfer");
  const [receivedAt, setReceivedAt] = useState(currentLocalDateTime);
  const [externalReference, setExternalReference] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploaded, setUploaded] = useState<string | null>(null);
  const referenceRequired = method === "bank_transfer" || method === "pos";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setUploading(true);
    setUploadError("");
    try {
      let mediaId = uploaded;
      if (receiptFile && !mediaId) {
        mediaId = (
          await uploadMedia(
            receiptFile,
            "payment_proof",
            undefined,
            "Admin-recorded payment receipt"
          )
        ).id;
        setUploaded(mediaId);
      }
      await onSubmit({
        payment_method: method,
        received_at: new Date(receivedAt).toISOString(),
        external_reference: externalReference.trim() || null,
        note: note.trim() || null,
        ...(mediaId ? { proof_media_id: mediaId } : {}),
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not save receipt");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!submitting && !uploading) onClose();
      }}
      title={`Record payment for ${memberName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ReceiptText className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            {paymentLabel}
          </div>
          <span className="text-lg font-semibold text-slate-900">
            {new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }).format(amountNaira)}
          </span>
        </div>

        <Select
          label="Payment method"
          name="payment_method"
          value={method}
          onChange={(event) =>
            setMethod(event.target.value as OfflineSessionPaymentInput["payment_method"])
          }
        >
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="pos">POS</option>
          <option value="other">Other verified method</option>
        </Select>

        <Input
          label="Received at"
          name="received_at"
          type="datetime-local"
          value={receivedAt}
          max={currentLocalDateTime()}
          onChange={(event) => setReceivedAt(event.target.value)}
          required
        />

        <Input
          label="Transaction or receipt reference"
          name="external_reference"
          value={externalReference}
          onChange={(event) => setExternalReference(event.target.value)}
          required={referenceRequired}
          maxLength={128}
          hint={referenceRequired ? undefined : "Optional for this payment method"}
        />

        <Textarea
          label={method === "other" ? "Verification note" : "Admin note"}
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          required={noteRequired || method === "other"}
          minLength={noteRequired ? 10 : undefined}
          maxLength={500}
          rows={3}
        />

        <label className="block text-sm">
          Receipt image or PDF (optional)
          <input
            type="file"
            accept="image/*,.pdf"
            className="mt-2 block w-full"
            disabled={uploading || submitting}
            onChange={(e) => {
              setReceiptFile(e.target.files?.[0] ?? null);
              setUploaded(null);
            }}
          />
        </label>
        {(error || uploadError) && <p className="text-sm text-rose-600">{error || uploadError}</p>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting || uploading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || uploading}>
            {submitting || uploading ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
