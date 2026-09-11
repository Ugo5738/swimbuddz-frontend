"use client";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { listClubOperatingAreas, type ClubPool } from "@/lib/clubOnboarding";

export async function listAllPartnerPools(): Promise<ClubPool[]> {
  const pools: ClubPool[] = [];
  let page = 1;
  while (true) {
    const result = await apiGet<{ items: ClubPool[]; total: number }>(
      `/api/v1/pools?page=${page}&page_size=100`
    );
    pools.push(...result.items);
    if (!result.items.length || pools.length >= result.total) return pools;
    page += 1;
  }
}

export function usePartnerPools() {
  return useQuery({
    queryKey: ["public-partner-pools"],
    queryFn: listAllPartnerPools,
    staleTime: 5 * 60_000,
  });
}

export function useLocationOptions(mode: "areas" | "pools" = "areas", saved: string[] = []) {
  const areas = useQuery({
    queryKey: ["public-operating-areas"],
    queryFn: listClubOperatingAreas,
    staleTime: 5 * 60_000,
    enabled: mode === "areas",
  });
  const pools = useQuery({
    queryKey: ["public-partner-pools"],
    queryFn: listAllPartnerPools,
    staleTime: 5 * 60_000,
    enabled: mode === "pools",
  });
  const result = mode === "areas" ? areas : pools;
  const options =
    mode === "areas"
      ? (areas.data ?? []).map((area) => ({ value: area.slug, label: area.name }))
      : (pools.data ?? []).map((pool) => ({
          value: pool.slug,
          label: [pool.name, pool.location_area].filter(Boolean).join(" · "),
        }));
  // Retain historical choices for editing; never silently drop someone's saved preferences.
  for (const value of saved) {
    if (value && !options.some((option) => option.value === value))
      options.push({ value, label: value.replace(/[_-]/g, " ") });
  }
  return { options, loading: result.isLoading, error: result.error, refetch: result.refetch };
}
