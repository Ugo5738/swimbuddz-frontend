// HistoryTab — pool admin status-change history. Extracted from
// `src/components/admin/PoolEditTabs.tsx` during the file-size sweep.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PoolsApi, type PoolStatusChange } from "@/lib/pools";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "./_shared";

// Used by the EmptyState in this tab.
import { MessageSquare } from "lucide-react";

export function HistoryTab({ poolId }: { poolId: string }) {
  const [changes, setChanges] = useState<PoolStatusChange[] | null>(null);

  useEffect(() => {
    PoolsApi.listStatusHistory(poolId)
      .then(setChanges)
      .catch(() => setChanges([]));
  }, [poolId]);

  if (changes === null) return <Card className="p-6 text-sm text-slate-500">Loading history...</Card>;
  if (changes.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        label="No status changes yet. Changes are logged automatically when you update partnership status."
      />
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((c) => (
        <Card key={c.id} className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400">
              {new Date(c.created_at).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              {c.from_status && (
                <>
                  <span className="text-sm text-slate-600 capitalize">
                    {c.from_status.replace("_", " ")}
                  </span>
                  <span className="text-slate-400">→</span>
                </>
              )}
              <span className="text-sm font-semibold text-slate-900 capitalize">
                {c.to_status.replace("_", " ")}
              </span>
            </div>
          </div>
          {c.reason && <p className="mt-1 text-sm text-slate-600">{c.reason}</p>}
        </Card>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// AGREEMENTS TAB
// ═════════════════════════════════════════════════════════════════════════

