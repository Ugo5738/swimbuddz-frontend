"use client";

import { Button } from "@/components/ui/Button";
import { RewardHistoryList } from "@/components/wallet/RewardHistoryList";
import { apiGet } from "@/lib/api";
import { exportRewardHistoryToCsv } from "@/lib/exportToCsv";
import { ArrowLeft, Download, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminMemberRewardHistoryPage() {
  const params = useParams();
  const authId = params.authId as string;
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await apiGet<{
        history: {
          created_at: string;
          display_name?: string | null;
          rule_name: string;
          category: string;
          bubbles_awarded: number;
          description?: string | null;
        }[];
        total: number;
      }>(`/api/v1/admin/wallet/rewards/history/${authId}?limit=10000`, {
        auth: true,
      });
      if (res.history.length === 0) {
        toast("No rewards to export");
        return;
      }
      exportRewardHistoryToCsv(res.history);
      toast.success("CSV downloaded!");
    } catch {
      toast.error("Failed to export rewards");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/wallet/rewards">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Member Reward History</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500 font-mono">{authId}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-1.5" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <RewardHistoryList apiPath={`/api/v1/admin/wallet/rewards/history/${authId}`} />
    </div>
  );
}
