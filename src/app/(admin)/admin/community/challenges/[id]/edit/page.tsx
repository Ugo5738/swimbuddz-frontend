"use client";

/**
 * Admin → Edit Challenge
 *
 * Hosts the shared <ChallengeForm> in edit mode. Loads the target
 * challenge by id (also fetching the full list to feed the prerequisite
 * picker) and PATCHes on save.
 */

import { ChallengeForm } from "@/components/admin/challenges/ChallengeForm";
import {
  authedFetch,
  challengeToForm,
  ClubChallenge,
  EMPTY_FORM,
  FormState,
  formToPayload,
} from "@/components/admin/challenges/types";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiEndpoints } from "@/lib/config";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditChallengePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const challengeId = params?.id ?? "";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [allChallenges, setAllChallenges] = useState<ClubChallenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the target challenge and the full collection in parallel.
  // We pull the full list from the same endpoint the list page uses
  // and then pick the target out — single-source-of-truth for shape,
  // and the list also feeds the Skill Ladder prerequisite picker.
  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await authedFetch(`${apiEndpoints.challenges}/?active_only=false`);
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const list = (await res.json()) as ClubChallenge[];
        if (cancelled) return;
        setAllChallenges(list);
        const target = list.find((c) => c.id === challengeId);
        if (!target) {
          setLoadError("Challenge not found");
        } else {
          setForm(challengeToForm(target));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load challenge");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challengeId]);

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

      const res = await authedFetch(`${apiEndpoints.challenges}/${challengeId}`, {
        method: "PATCH",
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

  if (!loaded) return <LoadingPage />;

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Couldn&apos;t load this challenge</h1>
        <p className="text-slate-600">{loadError}</p>
        <Link
          href="/admin/community/challenges"
          className="inline-flex items-center gap-1 text-sm font-medium text-cyan-700 hover:text-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to challenges
        </Link>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Edit Challenge</h1>
        <p className="mt-1 text-slate-600">
          Update title, schedule, rewards, or media for{" "}
          <span className="font-medium text-slate-900">{form.title || "this challenge"}</span>.
        </p>
      </header>

      <ChallengeForm
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/community/challenges")}
        editing={true}
        editingId={challengeId}
        saving={saving}
        error={error}
        allChallenges={allChallenges}
      />
    </div>
  );
}
