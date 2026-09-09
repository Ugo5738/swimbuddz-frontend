"use client";

import { getPoolOption } from "@/components/admin/PoolPicker";
import type { Club } from "@/lib/clubs";
import { adminGetPod, type PodSummary } from "@/lib/pods";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type ClubScope = "general" | "pod";

type ClubScopedForm = {
  club_id: string | null;
  pod_id: string | null;
  pool_id: string | null;
  location: string | null;
  location_name: string | null;
};

type UseClubSessionScopeOptions<T extends ClubScopedForm> = {
  sessionType: string;
  podId: string | null;
  setForm: Dispatch<SetStateAction<T>>;
};

/** Shared Club → optional Pod form state for sessions and templates. */
export function useClubSessionScope<T extends ClubScopedForm>({
  sessionType,
  podId,
  setForm,
}: UseClubSessionScopeOptions<T>) {
  const [scope, setScope] = useState<ClubScope>(podId ? "pod" : "general");
  const [selectedPod, setSelectedPod] = useState<PodSummary | null>(null);
  const [podDefaultPoolName, setPodDefaultPoolName] = useState<string | null>(null);

  // Legacy Pod-scoped records did not persist club_id. Resolve the Pod once
  // so an edit form can preselect its parent during a rolling deployment.
  useEffect(() => {
    const selectedPodId = sessionType === "club" ? podId : null;
    if (!selectedPodId) {
      setSelectedPod(null);
      setPodDefaultPoolName(null);
      return;
    }
    if (selectedPod?.id === selectedPodId) return;

    let cancelled = false;
    void adminGetPod(selectedPodId)
      .then(async (pod) => {
        if (cancelled) return;
        setSelectedPod(pod);
        setForm((current) =>
          current.pod_id === pod.id && !current.club_id
            ? { ...current, club_id: pod.club_id }
            : current
        );
        if (pod.default_pool_id) {
          const pool = await getPoolOption(pod.default_pool_id).catch(() => null);
          if (!cancelled) setPodDefaultPoolName(pool?.name ?? null);
        } else {
          setPodDefaultPoolName(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedPod(null);
      });

    return () => {
      cancelled = true;
    };
  }, [podId, selectedPod?.id, sessionType, setForm]);

  const applyDefaultPool = (poolId: string) => {
    setForm((current) => ({
      ...current,
      pool_id: poolId,
      location: null,
      location_name: null,
    }));
    void getPoolOption(poolId)
      .then((pool) => {
        if (!pool) return;
        setForm((current) =>
          current.pool_id === poolId ? { ...current, location_name: pool.name } : current
        );
      })
      .catch(() => undefined);
  };

  const handleClubChange = (clubId: string | null, club?: Club | null) => {
    setScope("general");
    setSelectedPod(null);
    setPodDefaultPoolName(null);
    setForm((current) => ({
      ...current,
      club_id: clubId,
      pod_id: null,
      pool_id: club?.default_pool_id ?? null,
      location: null,
      location_name: null,
    }));
    if (club?.default_pool_id) applyDefaultPool(club.default_pool_id);
  };

  const handlePodChange = (nextPodId: string | null, pod?: PodSummary | null) => {
    setSelectedPod(pod ?? null);
    setPodDefaultPoolName(null);
    setForm((current) => ({ ...current, pod_id: nextPodId }));
    if (pod?.default_pool_id) {
      applyDefaultPool(pod.default_pool_id);
      void getPoolOption(pod.default_pool_id)
        .then((pool) => setPodDefaultPoolName(pool?.name ?? null))
        .catch(() => undefined);
    }
  };

  const handleScopeChange = (nextScope: ClubScope) => {
    setScope(nextScope);
    if (nextScope === "general") {
      setSelectedPod(null);
      setPodDefaultPoolName(null);
      setForm((current) => ({ ...current, pod_id: null }));
    }
  };

  const resetScope = () => {
    setScope("general");
    setSelectedPod(null);
    setPodDefaultPoolName(null);
  };

  return {
    scope,
    selectedPod,
    podDefaultPoolName,
    applyDefaultPool,
    handleClubChange,
    handlePodChange,
    handleScopeChange,
    resetScope,
  };
}
