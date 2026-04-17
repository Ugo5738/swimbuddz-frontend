"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { ChevronDown, Edit2, MapPin, Phone, Plus, Search, Star, Trash2, Waves } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  is_active: boolean;
  contact_person: string | null;
  contact_phone: string | null;
  water_quality: number | null;
  overall_score: number | null;
  computed_score: string | number | null;
  pool_length_m: number | null;
  number_of_lanes: number | null;
  indoor_outdoor: string | null;
  price_per_swimmer_ngn: number | null;
  has_changing_rooms: boolean | null;
  has_parking: boolean | null;
  has_lifeguard: boolean | null;
  created_at: string;
  updated_at: string;
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

const PARTNERSHIP_STATUSES = [
  "prospect",
  "evaluating",
  "active_partner",
  "inactive",
  "rejected",
] as const;

const POOL_TYPES = ["community", "club", "academy", "private", "public", "hotel"] as const;

const STATUS_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  prospect: { label: "Prospect", className: "bg-slate-100 text-slate-700" },
  evaluating: { label: "Evaluating", className: "bg-amber-100 text-amber-700" },
  active_partner: { label: "Active Partner", className: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-500" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_CONFIG[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

function ScoreStars({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-slate-400">--</span>;
  }
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < full
              ? "fill-amber-400 text-amber-400"
              : i === full && half
                ? "fill-amber-200 text-amber-400"
                : "text-slate-200"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-500">{score.toFixed(1)}</span>
    </span>
  );
}

function PoolScoreCell({
  overall,
  computed,
}: {
  overall: number | null;
  computed: string | number | null;
}) {
  // Decimal serialises as string from Pydantic; normalise to number.
  const computedNum =
    computed === null || computed === undefined
      ? null
      : typeof computed === "string"
        ? Number(computed)
        : computed;
  const hasVariance =
    overall !== null &&
    computedNum !== null &&
    Number.isFinite(computedNum) &&
    Math.abs(overall - computedNum) >= 1.5;

  if (overall === null && computedNum === null) {
    return <span className="text-xs text-slate-400">--</span>;
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <ScoreStars score={overall} />
        {hasVariance && (
          <span
            className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
            title={`Admin rating (${overall}) differs from component average (${computedNum!.toFixed(1)}) by ${Math.abs(overall! - computedNum!).toFixed(1)} points`}
          >
            ⚠
          </span>
        )}
      </div>
      {computedNum !== null && (
        <div className="text-[11px] text-slate-400">
          avg {computedNum.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PoolRegistryPage() {
  // Data state
  const [pools, setPools] = useState<Pool[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  // Status dropdown state (per-pool inline editing)
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);

  // Stats (counts per status)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // ---------- Data Fetching ----------

  const loadPools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      params.set("is_active", "true");
      if (search) params.set("search", search);
      if (filterStatus) params.set("partnership_status", filterStatus);
      if (filterType) params.set("pool_type", filterType);

      const data = await apiGet<PoolListResponse>(`/api/v1/admin/pools?${params.toString()}`, {
        auth: true,
      });
      setPools(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to load pools:", e);
      toast.error("Failed to load pools");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterType]);

  const loadStatusCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = {};
      // Fetch all active pools (no status filter) just to compute counts.
      // If the backend doesn't expose a stats endpoint, we compute from the full list.
      const all = await apiGet<PoolListResponse>(
        "/api/v1/admin/pools?page_size=1000&is_active=true",
        { auth: true }
      );
      for (const pool of all.items) {
        counts[pool.partnership_status] = (counts[pool.partnership_status] || 0) + 1;
      }
      setStatusCounts(counts);
    } catch {
      // Non-critical - silently ignore
    }
  }, []);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType]);

  // ---------- Actions ----------

  const handleStatusChange = async (poolId: string, newStatus: string) => {
    try {
      await apiPost<Pool>(
        `/api/v1/admin/pools/${poolId}/status?partnership_status=${newStatus}`,
        undefined,
        { auth: true }
      );
      toast.success("Status updated");
      setOpenStatusDropdown(null);
      loadPools();
      loadStatusCounts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    }
  };

  const handleDelete = async (pool: Pool) => {
    if (!confirm(`Deactivate "${pool.name}"? This will soft-delete the pool.`)) return;
    try {
      await apiDelete("/api/v1/admin/pools/" + pool.id, { auth: true });
      toast.success("Pool removed");
      loadPools();
      loadStatusCounts();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete pool");
    }
  };

  // ---------- Pagination ----------

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ---------- Render ----------

  if (loading && pools.length === 0) {
    return <LoadingCard text="Loading pool registry..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Waves className="w-6 h-6 text-cyan-600" />
            Pool Registry
          </h1>
          <p className="text-slate-500">Screening &amp; partnership CRM for pool locations</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/pools/submissions">
            <Button variant="outline">Member submissions</Button>
          </Link>
          <Link href="/admin/pools/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Pool
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pools by name or area..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
          >
            <option value="">All Statuses</option>
            {PARTNERSHIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_BADGE_CONFIG[s]?.label || s}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
          >
            <option value="">All Types</option>
            {POOL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PARTNERSHIP_STATUSES.map((status) => {
          const config = STATUS_BADGE_CONFIG[status];
          return (
            <Card
              key={status}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
            >
              <p className="text-xs text-slate-500">{config.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{statusCounts[status] || 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Pool Table */}
      <Card className="p-0 overflow-hidden">
        {pools.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 font-medium">Pool</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Lanes</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool) => (
                  <tr
                    key={pool.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{pool.name}</div>
                      {pool.pool_length_m && (
                        <div className="text-xs text-slate-400">{pool.pool_length_m}m</div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      {pool.location_area ? (
                        <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {pool.location_area}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      {pool.pool_type ? (
                        <span className="text-sm text-slate-600 capitalize">{pool.pool_type}</span>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={pool.partnership_status} />
                    </td>

                    {/* Score — admin rating + computed composite with variance flag */}
                    <td className="px-4 py-3">
                      <PoolScoreCell
                        overall={pool.overall_score}
                        computed={pool.computed_score}
                      />
                    </td>

                    {/* Lanes */}
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {pool.number_of_lanes ?? "--"}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      {pool.contact_person ? (
                        <div>
                          <div className="text-sm text-slate-700">{pool.contact_person}</div>
                          {pool.contact_phone && (
                            <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <Phone className="w-3 h-3" />
                              {pool.contact_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">--</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenStatusDropdown(openStatusDropdown === pool.id ? null : pool.id)
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                          >
                            Status
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {openStatusDropdown === pool.id && (
                            <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                              {PARTNERSHIP_STATUSES.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(pool.id, s)}
                                  className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors ${
                                    pool.partnership_status === s
                                      ? "font-semibold text-cyan-700 bg-cyan-50"
                                      : "text-slate-700"
                                  }`}
                                >
                                  {STATUS_BADGE_CONFIG[s]?.label || s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Edit link */}
                        <Link
                          href={`/admin/pools/${pool.id}`}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 transition-colors"
                          title="Edit pool"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(pool)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Deactivate pool"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Waves className="w-10 h-10 mb-3" />
            <p className="text-sm">No pools found</p>
            {(search || filterStatus || filterType) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterStatus("");
                  setFilterType("");
                }}
                className="mt-2 text-sm text-cyan-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, total)} of {total}{" "}
            pools
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
