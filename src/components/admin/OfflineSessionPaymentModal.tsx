"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ReceiptText } from "lucide-react";
import { type FormEvent, useState } from "react";

export type OfflineSessionPaymentInput = {
  payment_method: "bank_transfer" | "cash" | "pos" | "other";
  received_at: string;
  external_reference: string | null;
  note: string | null;
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
}: {
  memberName: string;
  amountNaira: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: OfflineSessionPaymentInput) => Promise<void> | void;
}) {
  const [method, setMethod] =
    useState<OfflineSessionPaymentInput["payment_method"]>("bank_transfer");
  const [receivedAt, setReceivedAt] = useState(currentLocalDateTime);
  const [externalReference, setExternalReference] = useState("");
  const [note, setNote] = useState("");
  const referenceRequired = method === "bank_transfer" || method === "pos";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit({
      payment_method: method,
      received_at: new Date(receivedAt).toISOString(),
      external_reference: externalReference.trim() || null,
      note: note.trim() || null,
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={`Record payment for ${memberName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <ReceiptText className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            Session fee
          </div>
          <span className="text-lg font-semibold text-slate-900">
            ₦{amountNaira.toLocaleString("en-NG")}
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
          required={method === "other"}
          maxLength={500}
          rows={3}
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
