"use client";

/**
 * Admin → Create Challenge
 *
 * Hosts the shared <ChallengeForm> in create mode. On success, routes
 * back to the list. We fetch the full challenge collection so the
 * prerequisite picker can offer existing steps in the same series_slug
 * — empty on first load is fine, the picker just shows nothing until
 * the admin types a slug.
 */

import { ChallengeForm } from "@/components/admin/challenges/ChallengeForm";
import {
  authedFetch,
  ClubChallenge,
  EMPTY_FORM,
  FormState,
  formToPayload,
} from "@/components/admin/challenges/types";
import { apiEndpoints } from "@/lib/config";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewChallengePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [allChallenges, setAllChallenges] = useState<ClubChallenge[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Used solely to populate the prerequisite picker in the Skill Ladder
  // section — failure is non-fatal (the picker simply shows nothing).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`${apiEndpoints.challenges}/?active_only=false`);
        if (res.ok) {
          const data = (await res.json()) as ClubChallenge[];
          if (!cancelled) setAllChallenges(data);
        }
      } catch {
        // ignore — prerequisite list is optional context
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = formToPayload(form);
      if (!payload.title) throw new Error("Title is required");
      if (!payload.badge_name) throw new Error("Badge name is required");
      if (
        payload.team_enabled &&
        payload.team_min_size != null &&
        payload.team_max_size != null &&
        payload.team_min_size > payload.team_max_size
      ) {
        throw new Error("Min team size cannot exceed max team size");
      }
      if (
        payload.starts_at &&
        payload.ends_at &&
        new Date(payload.starts_at) > new Date(payload.ends_at)
      ) {
        throw new Error("Start time cannot be after end time");
      }

      // Trailing slash on the collection root avoids a 307 redirect to
      // `/challenges/` that the proxy rewrites to http:// (mixed content).
      const res = await authedFetch(`${apiEndpoints.challenges}/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Save failed (${res.status} ${res.statusText})`);
      }

      router.push("/admin/community/challenges");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/community/challenges"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to challenges
        </Link>
      </div>
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">New Challenge</h1>
        <p className="mt-1 text-slate-600">
          Create a challenge with optional Bubbles + volunteer-hour rewards.
        </p>
      </header>

      <ChallengeForm
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/community/challenges")}
        editing={false}
        editingId={null}
        saving={saving}
        error={error}
        allChallenges={allChallenges}
      />
    </div>
  );
}
