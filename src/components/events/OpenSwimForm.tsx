"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import {
  EventsApi,
  type EventResponse,
  type OpenSwimCreate,
  type OpenSwimUpdate,
  type PartnerPool,
} from "@/lib/events";

/** ISO string → value for a <input type="datetime-local"> (local time). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type Props = {
  mode: "create" | "edit";
  eventId?: string;
  initial?: EventResponse;
};

export function OpenSwimForm({ mode, eventId, initial }: Props) {
  const router = useRouter();

  const [pools, setPools] = useState<PartnerPool[]>([]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [poolId, setPoolId] = useState<string>(initial?.pool_id ?? "");
  const [startTime, setStartTime] = useState(toLocalInput(initial?.start_time));
  const [endTime, setEndTime] = useState(toLocalInput(initial?.end_time));
  const [maxCapacity, setMaxCapacity] = useState<string>(
    initial?.max_capacity != null ? String(initial.max_capacity) : ""
  );
  const [surcharge, setSurcharge] = useState<string>(
    initial?.organizer_surcharge_naira != null ? String(initial.organizer_surcharge_naira) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pool can only be chosen at creation — changing it later would re-price the
  // meet for anyone who already paid. Surcharge stays editable.
  const poolEditable = mode === "create";

  useEffect(() => {
    if (!poolEditable) return;
    EventsApi.listPerSwimmerPools()
      .then(setPools)
      .catch(() => {});
  }, [poolEditable]);

  const selectedPool = useMemo(() => pools.find((p) => p.id === poolId) || null, [pools, poolId]);
  const hasPool = mode === "edit" ? !!initial?.pool_id : !!poolId;
  const poolFee = selectedPool
    ? Number(selectedPool.price_per_swimmer_ngn ?? 0)
    : (initial?.pool_fee_naira ?? 0);
  const surchargeNum = surcharge ? Number(surcharge) : 0;
  const totalPerSwimmer = (isNaN(poolFee) ? 0 : poolFee) + (isNaN(surchargeNum) ? 0 : surchargeNum);

  const onPoolChange = (val: string) => {
    setPoolId(val);
    const p = pools.find((x) => x.id === val);
    if (p) setLocation(p.name);
    else setLocation("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Give your meet a title.");
    if (!startTime) return setError("Pick a start time.");
    if (!poolId && !location.trim()) return setError("Add a location, or pick a pool.");

    setSubmitting(true);
    try {
      const startIso = new Date(startTime).toISOString();
      const endIso = endTime ? new Date(endTime).toISOString() : null;
      const cap = maxCapacity ? parseInt(maxCapacity, 10) : null;
      const sur = surcharge ? Number(surcharge) : null;

      if (mode === "create") {
        const payload: OpenSwimCreate = {
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start_time: startIso,
          end_time: endIso,
          max_capacity: cap,
          pool_id: poolId || null,
          organizer_surcharge_naira: poolId ? sur : null,
        };
        const created = await EventsApi.createOpenSwim(payload);
        toast.success("Your meet is live! 🏊");
        router.push(`/community/events/${created.id}`);
      } else if (eventId) {
        const payload: OpenSwimUpdate = {
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          start_time: startIso,
          end_time: endIso,
          max_capacity: cap,
          organizer_surcharge_naira: hasPool ? sur : null,
        };
        await EventsApi.updateOpenSwim(eventId, payload);
        toast.success("Meet updated.");
        router.push(`/community/events/${eventId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-4 p-6">
        <Input
          label="Meet title"
          required
          placeholder="Saturday morning swim at Rowe Park"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="What's the plan?"
          rows={3}
          placeholder="Easy 45-minute swim, all levels welcome. We'll grab smoothies after."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts"
            type="datetime-local"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <Input
            label="Ends (optional)"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <Input
          label="Max swimmers (optional)"
          type="number"
          min={1}
          placeholder="e.g. 12"
          value={maxCapacity}
          onChange={(e) => setMaxCapacity(e.target.value)}
        />
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Where</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick a partner pool to collect the per-swimmer fee automatically, or leave it free and
            meet anywhere.
          </p>
        </div>

        {poolEditable ? (
          <Select
            label="Pool (optional)"
            value={poolId}
            onChange={(e) => onPoolChange(e.target.value)}
          >
            <option value="">No pool — free / informal venue</option>
            {pools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.price_per_swimmer_ngn
                  ? ` — ₦${Number(p.price_per_swimmer_ngn).toLocaleString()}/swimmer`
                  : ""}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-sm text-slate-600">
            {hasPool
              ? `Pool meet${initial?.location ? ` · ${initial.location}` : ""} (pool can't be changed after creation)`
              : "Free / informal meet"}
          </p>
        )}

        <Input
          label="Location"
          required={!poolId}
          placeholder="Federal Palace Hotel pool, VI"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={poolEditable && !!poolId}
          hint={poolEditable && !!poolId ? "Auto-filled from the selected pool." : undefined}
        />

        {hasPool && (
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <Input
              label="Add your own fee per swimmer (optional, ₦)"
              type="number"
              min={0}
              placeholder="0"
              value={surcharge}
              onChange={(e) => setSurcharge(e.target.value)}
              hint="On top of the pool fee. Collected by SwimBuddz; your share is paid out manually by the team."
            />
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
              <span className="text-slate-600">Each swimmer pays</span>
              <span className="font-semibold text-slate-900">
                ₦{totalPerSwimmer.toLocaleString()}
                {totalPerSwimmer % 100 === 0 && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    · {totalPerSwimmer / 100} 🫧
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </Card>

      <div className="rounded-lg bg-cyan-50 p-4 text-xs text-cyan-900">
        Open-swim meets are for adults (18+). Swimmers accept a quick liability waiver when they
        join a paid meet. Be a good host — show up and keep it safe.
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Publish meet" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
