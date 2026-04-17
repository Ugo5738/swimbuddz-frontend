"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MediaInput } from "@/components/ui/MediaInput";
import { PoolSubmissionsApi, type PoolSubmissionCreate } from "@/lib/poolSubmissions";
import { ArrowLeft, CheckCircle2, Waves } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const POOL_TYPE_OPTIONS: { value: PoolSubmissionCreate["pool_type"]; label: string }[] = [
  { value: "community", label: "Community" },
  { value: "club", label: "Club" },
  { value: "academy", label: "Academy" },
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
  { value: "hotel", label: "Hotel" },
];

const VISIT_FREQUENCY_OPTIONS = ["weekly", "monthly", "occasionally", "once"];

export default function SuggestPoolPage() {
  const [form, setForm] = useState<PoolSubmissionCreate>({ pool_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof PoolSubmissionCreate>(
    key: K,
    value: PoolSubmissionCreate[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.pool_name || form.pool_name.trim().length < 2) {
      setError("Pool name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await PoolSubmissionsApi.create({
        ...form,
        pool_name: form.pool_name.trim(),
        location_area: form.location_area?.trim() || undefined,
        address: form.address?.trim() || undefined,
        member_notes: form.member_notes?.trim() || undefined,
      });
      setSubmitted(true);
      toast.success("Thanks! Your pool suggestion is in the moderation queue.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/account"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account
        </Link>
        <Card className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Submission received</h2>
          <p className="text-slate-600">
            Our team will review your pool suggestion shortly. If approved, you&rsquo;ll earn
            Bubbles as a thank-you for helping grow the SwimBuddz pool network.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => {
                setForm({ pool_name: "" });
                setSubmitted(false);
              }}
              variant="outline"
            >
              Suggest another pool
            </Button>
            <Link href="/account">
              <Button>Back to account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to account
      </Link>

      <div className="flex items-start gap-3">
        <div className="p-3 rounded-xl bg-cyan-50">
          <Waves className="h-6 w-6 text-cyan-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suggest a pool</h1>
          <p className="text-sm text-slate-600">
            Know a pool that should be on SwimBuddz? Share it with us. Approved suggestions
            earn you Bubbles.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Could not submit">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pool basics
          </h2>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Pool name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={form.pool_name}
              onChange={(e) => update("pool_name", e.target.value)}
              required
              placeholder="e.g. Ocean View Hotel Pool"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Area / neighbourhood</label>
              <input
                type="text"
                value={form.location_area ?? ""}
                onChange={(e) => update("location_area", e.target.value)}
                placeholder="e.g. Lekki Phase 1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Pool type</label>
              <select
                value={form.pool_type ?? ""}
                onChange={(e) =>
                  update(
                    "pool_type",
                    (e.target.value || undefined) as PoolSubmissionCreate["pool_type"],
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Unsure</option>
                {POOL_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Full address{" "}
              <span className="text-slate-400 font-normal">(optional, helps us find it)</span>
            </label>
            <textarea
              value={form.address ?? ""}
              onChange={(e) => update("address", e.target.value)}
              rows={2}
              placeholder="Street, landmark, or map pin description"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            What&rsquo;s at the pool?
          </h2>
          <p className="text-xs text-slate-500">Tick whatever you know about the facilities.</p>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: "has_changing_rooms", label: "Changing rooms" },
                { key: "has_showers", label: "Showers" },
                { key: "has_lockers", label: "Lockers" },
                { key: "has_parking", label: "Parking" },
                { key: "has_lifeguard", label: "Lifeguard on duty" },
              ] as const
            ).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={form[key] === true}
                  onChange={(e) => update(key, e.target.checked || undefined)}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your experience
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Visit frequency</label>
              <select
                value={form.visit_frequency ?? ""}
                onChange={(e) => update("visit_frequency", e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Not sure</option>
                {VISIT_FREQUENCY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Your rating (1-5)</label>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      update("member_rating", form.member_rating === n ? undefined : n)
                    }
                    className={`h-8 w-8 rounded-md text-sm font-semibold ${
                      form.member_rating && n <= form.member_rating
                        ? "bg-amber-400 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.member_notes ?? ""}
              onChange={(e) => update("member_notes", e.target.value)}
              rows={3}
              placeholder="Anything helpful for our team — water quality, coach availability, crowd levels, price..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <MediaInput
              purpose="general"
              mode="both"
              accept="image/*,video/*"
              label="Photo or video (optional)"
              onChange={(_mediaId, fileUrl) => {
                // We persist the file URL on the submission (photo_url column
                // stores either image or video URL). The media record stays
                // in media_service for later reuse if admin promotes the pool.
                update("photo_url", fileUrl || undefined);
              }}
              onError={(err) => {
                if (err) toast.error(err);
              }}
            />
            <p className="mt-1 text-xs text-slate-500">
              Upload a photo or short video of the pool, or paste a link.
            </p>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact (optional)
          </h2>
          <p className="text-xs text-slate-500">
            If you know the pool&rsquo;s contact info, we&rsquo;ll skip the legwork.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                type="tel"
                value={form.contact_phone ?? ""}
                onChange={(e) => update("contact_phone", e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.contact_email ?? ""}
                onChange={(e) => update("contact_email", e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/account">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit suggestion"}
          </Button>
        </div>
      </form>
    </div>
  );
}
