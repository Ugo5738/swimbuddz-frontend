"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import {
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  MapPin,
  Ruler,
  Search,
  ShieldCheck,
  ShowerHead,
  Star,
  Users,
  Waves,
  X,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pool {
  id: string;
  name: string;
  slug: string;
  location_area: string | null;
  pool_type: string | null;
  partnership_status: string;
  indoor_outdoor: string | null;
  pool_length_m: number | null;
  number_of_lanes: number | null;
  depth_min_m: number | null;
  depth_max_m: number | null;
  max_swimmers_capacity: number | null;
  water_quality: number | null;
  overall_score: number | null;
  has_changing_rooms: boolean | null;
  has_showers: boolean | null;
  has_parking: boolean | null;
  has_lifeguard: boolean | null;
  price_per_swimmer_ngn: number | null;
  available_days_times: Record<string, string> | null;
}

interface PoolListResponse {
  items: Pool[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POOL_TYPES = [
  { label: "All", value: "" },
  { label: "Community", value: "community" },
  { label: "Club", value: "club" },
  { label: "Academy", value: "academy" },
] as const;

const TYPE_BADGE_COLORS: Record<string, string> = {
  community: "bg-blue-100 text-blue-700",
  club: "bg-purple-100 text-purple-700",
  academy: "bg-cyan-100 text-cyan-700",
};

const DAY_ABBREVIATIONS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function renderStars(score: number | null) {
  if (score === null || score === undefined) return null;
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rounded ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-slate-300"
          }
        />
      ))}
      <span className="ml-1 text-xs text-slate-500">{score.toFixed(1)}</span>
    </div>
  );
}

function FacilityIcon({
  available,
  icon: Icon,
  label,
}: {
  available: boolean | null;
  icon: React.ElementType;
  label: string;
}) {
  const has = available === true;
  return (
    <span title={`${label}: ${has ? "Yes" : "No"}`} className="flex items-center gap-0.5">
      <Icon className={`h-4 w-4 ${has ? "text-emerald-500" : "text-slate-300"}`} />
      {has ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <X className="h-3 w-3 text-slate-300" />
      )}
    </span>
  );
}

function getDayAbbreviations(availableDaysTimes: Record<string, string> | null): string[] {
  if (!availableDaysTimes) return [];
  return Object.keys(availableDaysTimes)
    .map((day) => DAY_ABBREVIATIONS[day.toLowerCase()] ?? day)
    .filter(Boolean);
}

function depthRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${min}m - ${max}m`;
  if (min !== null) return `${min}m+`;
  if (max !== null) return `up to ${max}m`;
  return null;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PoolCard({ pool }: { pool: Pool }) {
  const days = getDayAbbreviations(pool.available_days_times);
  const depth = depthRange(pool.depth_min_m, pool.depth_max_m);
  const typeBadge = pool.pool_type
    ? (TYPE_BADGE_COLORS[pool.pool_type] ?? "bg-slate-100 text-slate-600")
    : null;

  return (
    <Card className="flex flex-col gap-4 p-5 hover:shadow-md transition-shadow">
      {/* Header: name + type badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight">{pool.name}</h3>
          {typeBadge && pool.pool_type && (
            <span
              className={`shrink-0 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeBadge}`}
            >
              {pool.pool_type}
            </span>
          )}
        </div>

        {pool.location_area && (
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            <span>{pool.location_area}</span>
          </div>
        )}
      </div>

      {/* Key specs */}
      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
        {pool.pool_length_m !== null && (
          <div className="flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5 text-cyan-500" />
            <span>{pool.pool_length_m}m</span>
          </div>
        )}
        {pool.number_of_lanes !== null && (
          <div className="flex items-center gap-1">
            <Waves className="h-3.5 w-3.5 text-cyan-500" />
            <span>{pool.number_of_lanes} lanes</span>
          </div>
        )}
        {depth && (
          <div className="flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5 text-cyan-500 rotate-90" />
            <span>{depth}</span>
          </div>
        )}
        {pool.max_swimmers_capacity !== null && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-cyan-500" />
            <span>{pool.max_swimmers_capacity} cap</span>
          </div>
        )}
        {pool.indoor_outdoor && (
          <div className="flex items-center gap-1 capitalize">
            <span className="text-cyan-500 text-[10px] font-bold">
              {pool.indoor_outdoor === "indoor"
                ? "IN"
                : pool.indoor_outdoor === "outdoor"
                  ? "OUT"
                  : "IN/OUT"}
            </span>
            <span>{pool.indoor_outdoor}</span>
          </div>
        )}
      </div>

      {/* Facilities */}
      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <FacilityIcon available={pool.has_changing_rooms} icon={DoorOpen} label="Changing rooms" />
        <FacilityIcon available={pool.has_showers} icon={ShowerHead} label="Showers" />
        <FacilityIcon available={pool.has_parking} icon={CarFront} label="Parking" />
        <FacilityIcon available={pool.has_lifeguard} icon={ShieldCheck} label="Lifeguard" />
      </div>

      {/* Available days */}
      {days.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5 text-cyan-500" />
          <div className="flex flex-wrap gap-1">
            {days.map((d) => (
              <span
                key={d}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: price + score */}
      <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-3">
        {pool.price_per_swimmer_ngn !== null ? (
          <div>
            <span className="text-lg font-bold text-cyan-600">
              {formatPrice(pool.price_per_swimmer_ngn)}
            </span>
            <span className="text-xs text-slate-400 ml-1">/swimmer</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400 italic">Price on request</span>
        )}
        {renderStars(pool.overall_score)}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PoolsPage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading pools..." />}>
      <PoolsPageContent />
    </Suspense>
  );
}

function PoolsPageContent() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [poolType, setPoolType] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadPools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (poolType) params.set("pool_type", poolType);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));

      const data = await apiGet<PoolListResponse>(`/api/v1/pools?${params.toString()}`);
      setPools(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to load pools:", e);
      setPools([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [poolType, search, page]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [poolType, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-10 bg-gradient-to-br from-cyan-500 to-blue-600 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
        <Waves className="mx-auto h-10 w-10 text-white/80 mb-3" />
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Our Pool Locations</h1>
        <p className="text-cyan-100 max-w-xl mx-auto">
          Discover our network of partner pools across Lagos. Whether you swim for fitness, fun, or
          competition, we have a pool for you.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search pools by name or area..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
        </form>

        {/* Pool type filter chips */}
        <div className="flex flex-wrap gap-2">
          {POOL_TYPES.map((pt) => (
            <Button
              key={pt.value}
              variant={poolType === pt.value ? "primary" : "secondary"}
              size="sm"
              onClick={() => setPoolType(pt.value)}
            >
              {pt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingCard text="Loading pools..." />
      ) : pools.length > 0 ? (
        <>
          {/* Results count */}
          <p className="text-sm text-slate-500">
            Showing {pools.length} of {total} pool{total !== 1 ? "s" : ""}
          </p>

          {/* Pool cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {pools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-50 mb-4">
            <Waves className="h-10 w-10 text-cyan-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No pools found</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {search || poolType
              ? "Try adjusting your search or filter to find more pools."
              : "We are working on adding partner pools. Check back soon!"}
          </p>
          {(search || poolType) && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPoolType("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
