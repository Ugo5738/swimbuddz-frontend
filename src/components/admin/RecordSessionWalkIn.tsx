"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Member = { id: string; first_name: string; last_name: string; email: string };

export function RecordSessionWalkIn({
  defaultFee,
  disabled,
  onRecord,
}: {
  defaultFee: number;
  disabled: boolean;
  onRecord: (memberId: string, feeKobo: number, note: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [fee, setFee] = useState(defaultFee);
  const [note, setNote] = useState("");
  const { data, loading, error } = useApi<Member[]>(
    query ? `/api/v1/members/?search=${encodeURIComponent(query)}&limit=20` : null
  );
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 print:hidden">
      <summary className="cursor-pointer font-medium">
        Record attendance for a member not on this roster
      </summary>
      <p className="my-3 text-sm text-slate-600">
        For an actual past swim or walk-in, including someone who registered later. This records
        attendance, not payment or Club enrollment. Then use Record payment on their row to
        reconcile money already received.
      </p>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (
            selected &&
            confirm(
              `Record ${selected.first_name} as present in the selected session, with a session fee of ₦${fee.toLocaleString()}? No payment will be collected by this action.`
            )
          ) {
            void onRecord(selected.id, Math.round(fee * 100), note);
          }
        }}
      >
        <div className="flex items-end gap-2">
          <Input
            label="Find member by name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={loading || search.trim().length < 2}
            onClick={() => {
              setQuery(search.trim());
              setSelected(null);
            }}
          >
            Search members
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {loading && <p>Searching…</p>}
        {!loading && !error && query === search.trim() && data && (
          <select
            aria-label="Member to record"
            required
            value={selected?.id ?? ""}
            onChange={(e) =>
              setSelected(data.find((member) => member.id === e.target.value) ?? null)
            }
            className="w-full rounded border p-2"
          >
            <option value="">{data.length ? "Select the member" : "No matching members"}</option>
            {data.map((member) => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name} — {member.email}
              </option>
            ))}
          </select>
        )}
        <Input
          label="Session fee owed for this swim (₦)"
          type="number"
          min={0}
          step="0.01"
          required
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          hint="Use the amount agreed for that swim, not a later price. Enter 0 only if included or genuinely free. Existing bookings retain their saved amount."
        />
        <Input
          label="Attendance reconciliation note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          maxLength={500}
          hint="Explain why this attendance is being recorded now."
        />
        <Button type="submit" disabled={disabled || !selected || !note.trim()}>
          Record attended swim
        </Button>
      </form>
    </details>
  );
}
