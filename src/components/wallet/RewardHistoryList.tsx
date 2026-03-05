"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Award } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type RewardHistoryEntry = {
  id: string;
  rule_name: string;
  display_name?: string | null;
  category: string;
  bubbles_awarded: number;
  description?: string | null;
  created_at: string;
};

type RewardHistoryResponse = {
  history: RewardHistoryEntry[];
  total: number;
};

type RewardHistoryListProps = {
  /** Override API path (e.g. for admin member lookup) */
  apiPath?: string;
  pageSize?: number;
  showFilter?: boolean;
  showPagination?: boolean;
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "acquisition", label: "Acquisition" },
  { value: "retention", label: "Retention" },
  { value: "community", label: "Community" },
  { value: "spending", label: "Spending" },
  { value: "academy", label: "Academy" },
];

const CATEGORY_COLORS: Record<string, string> = {
  acquisition: "bg-blue-100 text-blue-700",
  retention: "bg-emerald-100 text-emerald-700",
  community: "bg-teal-100 text-teal-700",
  spending: "bg-purple-100 text-purple-700",
  academy: "bg-purple-100 text-purple-700",
};

export function RewardHistoryList({
  apiPath = "/api/v1/wallet/rewards/history",
  pageSize = 20,
  showFilter = true,
  showPagination = true,
}: RewardHistoryListProps) {
  const [data, setData] = useState<RewardHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (categoryFilter) params.set("category", categoryFilter);

      const result = await apiGet<RewardHistoryResponse>(`${apiPath}?${params}`, { auth: true });
      setData(result);
    } catch (e) {
      console.error("Failed to load reward history:", e);
    } finally {
      setLoading(false);
    }
  }, [apiPath, page, pageSize, categoryFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading && !data) {
    return <LoadingPage text="Loading reward history..." />;
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Filter */}
      {showFilter && (
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {data && (
            <span className="ml-3 text-sm text-slate-500">
              {data.total} reward{data.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* List */}
      {data?.history.length === 0 ? (
        <Card className="p-6 bg-slate-50 border-dashed text-center">
          <Award className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">No rewards yet — start earning by attending sessions!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.history.map((entry) => (
            <Card key={entry.id} className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-full p-2 bg-emerald-100 shrink-0">
                    <Award className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {entry.display_name || entry.rule_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${CATEGORY_COLORS[entry.category] || ""}`}
                      >
                        {entry.category}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatDate(entry.created_at)}</span>
                    </div>
                    {entry.description && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{entry.description}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 ml-3">
                  <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
                    +{entry.bubbles_awarded} 🫧
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
