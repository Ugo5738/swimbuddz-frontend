"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { AlertTriangle, CheckCircle, Eye, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type Alert = {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  member_auth_id?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type AlertListResponse = {
  items: Alert[];
  total: number;
};

type AlertSummary = {
  total_open: number;
  total_acknowledged: number;
  total_resolved: number;
  total_dismissed: number;
  by_severity: { status: string; severity: string; count: number }[];
};

// ============================================================================
// Helpers
// ============================================================================

function severityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "open":
      return "danger" as const;
    case "acknowledged":
      return "warning" as const;
    case "resolved":
      return "success" as const;
    case "dismissed":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

// ============================================================================
// Component
// ============================================================================

const STATUS_TABS = ["open", "acknowledged", "resolved", "dismissed", "all"] as const;

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("open");
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const statusParam = activeTab === "all" ? "" : `status=${activeTab}`;
      const [alertsRes, summaryData] = await Promise.all([
        apiGet<AlertListResponse>(`/api/v1/admin/wallet/rewards/alerts?${statusParam}`, {
          auth: true,
        }),
        apiGet<AlertSummary>("/api/v1/admin/wallet/rewards/alerts/summary", { auth: true }),
      ]);
      setAlerts(alertsRes.items ?? []);
      setSummary(summaryData);
    } catch (e) {
      console.error("Failed to load alerts:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Auto-refresh every 60 seconds for the open tab
  useEffect(() => {
    if (activeTab === "open") {
      pollRef.current = setInterval(loadData, 60_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeTab, loadData]);

  const handleAction = async (alertId: string, newStatus: string, notes?: string) => {
    setActioningIds((prev) => new Set(prev).add(alertId));
    try {
      await apiPatch(
        `/api/v1/admin/wallet/rewards/alerts/${alertId}`,
        { status: newStatus, resolution_notes: notes || undefined },
        { auth: true }
      );
      toast.success(`Alert ${newStatus}`);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update alert");
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  if (loading && alerts.length === 0) {
    return <LoadingPage text="Loading alerts..." />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-900">Reward Alerts</h1>

      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center border-red-200">
            <p className="text-xs text-slate-500">Open</p>
            <p className="text-lg font-semibold text-red-600">{summary.total_open}</p>
          </Card>
          <Card className="p-3 text-center border-amber-200">
            <p className="text-xs text-slate-500">Acknowledged</p>
            <p className="text-lg font-semibold text-amber-600">{summary.total_acknowledged}</p>
          </Card>
          <Card className="p-3 text-center border-emerald-200">
            <p className="text-xs text-slate-500">Resolved</p>
            <p className="text-lg font-semibold text-emerald-600">{summary.total_resolved}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-slate-500">Dismissed</p>
            <p className="text-lg font-semibold text-slate-600">{summary.total_dismissed}</p>
          </Card>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg capitalize transition ${
              activeTab === tab
                ? "bg-white border border-b-0 border-slate-200 text-cyan-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
            {tab === "open" && summary && summary.total_open > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs font-bold px-1.5">
                {summary.total_open}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <Card className="p-6 bg-slate-50 border-dashed text-center">
          <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-600">
            {activeTab === "open"
              ? "No open alerts — the system is healthy 🫧"
              : `No ${activeTab} alerts`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 border-l-4 ${
                alert.status === "open"
                  ? "border-l-red-500"
                  : alert.status === "acknowledged"
                    ? "border-l-amber-500"
                    : "border-l-slate-300"
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        alert.severity === "critical"
                          ? "text-red-500"
                          : alert.severity === "high"
                            ? "text-orange-500"
                            : "text-amber-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{alert.title}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{alert.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className={severityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant={statusColor(alert.status)}>{alert.status}</Badge>
                        <span className="text-xs text-slate-500">
                          {formatDate(alert.created_at, { includeTime: true })}
                        </span>
                        {alert.member_auth_id && (
                          <span className="text-xs text-slate-500 font-mono">
                            {alert.member_auth_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {(alert.status === "open" || alert.status === "acknowledged") && (
                  <div className="flex flex-wrap items-end gap-2 ml-8">
                    {alert.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actioningIds.has(alert.id)}
                        onClick={() => handleAction(alert.id, "acknowledged")}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    <div className="flex items-end gap-1.5">
                      <input
                        type="text"
                        placeholder="Resolution notes..."
                        value={resolveNotes[alert.id] || ""}
                        onChange={(e) =>
                          setResolveNotes((prev) => ({
                            ...prev,
                            [alert.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-40 sm:w-56"
                      />
                      <Button
                        size="sm"
                        disabled={actioningIds.has(alert.id)}
                        onClick={() => handleAction(alert.id, "resolved", resolveNotes[alert.id])}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actioningIds.has(alert.id)}
                        onClick={() => handleAction(alert.id, "dismissed", resolveNotes[alert.id])}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {alert.resolution_notes && (
                  <p className="text-xs text-slate-500 ml-8 italic">
                    Notes: {alert.resolution_notes}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
