"use client";

/**
 * Admin gallery of milestone evidence for a single enrollment.
 *
 * Each tile renders the same `<video>` / `<img>` the coach sees,
 * plus admin-only affordances: a Download button (issues a 60s
 * presigned URL and triggers a browser save) and an Override
 * button (opens MilestoneOverrideModal).
 *
 * Authoring choices:
 * - Tile media uses the existing 1h-TTL presigned `file_url` from
 *   the API response — same flow as the coach view, no extra round
 *   trips per tile.
 * - The Download button does NOT keep the URL in state. It requests
 *   the URL on click and immediately triggers a hidden-`<a>` download,
 *   matching the design's 60s TTL constraint (the URL would expire
 *   before any meaningful state-retention window).
 */

import { useState } from "react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { formatDate } from "@/lib/format";
import {
  AdminAcademyApi,
  type AdminEvidenceItem,
  type AdminEvidenceList,
} from "@/lib/academy-admin";
import { useApi } from "@/hooks/useApi";
import { MilestoneOverrideModal } from "@/components/admin/MilestoneOverrideModal";

type Props = {
  enrollmentId: string;
  /**
   * Lookup map of milestone_id → display name. Used to show a
   * human-readable label per tile without making the gallery
   * endpoint also fetch milestone names. Pass `{}` if names
   * aren't yet loaded — tiles fall back to the raw UUID.
   */
  milestoneNames?: Record<string, string>;
};

export function EnrollmentEvidenceGallery({
  enrollmentId,
  milestoneNames = {},
}: Props) {
  const { data, loading, error, refetch } = useApi<AdminEvidenceList>(
    `/api/v1/media/admin/enrollments/${enrollmentId}/evidence`,
  );

  const [overrideTarget, setOverrideTarget] = useState<
    AdminEvidenceItem | null
  >(null);

  if (loading) {
    return <LoadingCard text="Loading evidence…" />;
  }
  if (error) {
    return (
      <Alert variant="error">
        Failed to load evidence: {error}
      </Alert>
    );
  }
  if (!data || data.items.length === 0) {
    return (
      <Card className="p-4 text-sm text-slate-600">
        No evidence has been uploaded for this enrollment yet.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {data.total} item{data.total === 1 ? "" : "s"}. Every load and download
        is recorded in the media audit log.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.items.map((item) => (
          <EvidenceTile
            key={item.media_id}
            item={item}
            milestoneName={
              milestoneNames[item.milestone_id] || item.milestone_id
            }
            onOverride={() => setOverrideTarget(item)}
          />
        ))}
      </div>

      {overrideTarget && (
        <MilestoneOverrideModal
          isOpen={true}
          onClose={() => setOverrideTarget(null)}
          enrollmentId={overrideTarget.enrollment_id}
          milestoneId={overrideTarget.milestone_id}
          milestoneName={
            milestoneNames[overrideTarget.milestone_id] ||
            overrideTarget.milestone_id
          }
          currentStatus={overrideTarget.progress_status}
          onSuccess={() => {
            setOverrideTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function EvidenceTile({
  item,
  milestoneName,
  onOverride,
}: {
  item: AdminEvidenceItem;
  milestoneName: string;
  onOverride: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { download_url } = await AdminAcademyApi.getDownloadUrl(
        item.media_id,
      );
      // Trigger the browser save via a hidden anchor. Using
      // `download` on an external host is unreliable in some
      // browsers (presigned S3 host won't honour it cross-origin) —
      // we set it as a hint and fall back to opening in a new tab,
      // which the user can then "Save as".
      const a = document.createElement("a");
      a.href = download_url;
      a.target = "_blank";
      a.rel = "noopener";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not request download.";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const isVideo = item.media_type === "VIDEO";
  const isImage = item.media_type === "IMAGE";
  const statusBadgeVariant: "success" | "warning" =
    item.progress_status === "achieved" ? "success" : "warning";

  return (
    <Card className="p-3 flex flex-col gap-2 bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900 truncate">
            {milestoneName}
          </h3>
          <p className="text-xs text-slate-500">
            Claimed{" "}
            {item.claim_achieved_at
              ? formatDate(item.claim_achieved_at)
              : "—"}
          </p>
        </div>
        <Badge variant={statusBadgeVariant}>{item.progress_status}</Badge>
      </div>

      <div className="rounded-md overflow-hidden bg-slate-100">
        {isVideo && item.file_url ? (
          <video
            controls
            preload="metadata"
            className="w-full max-h-72"
            src={item.file_url}
            poster={item.thumbnail_url || undefined}
          >
            Your browser does not support video playback.
          </video>
        ) : isImage && item.file_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.file_url}
            alt={`Evidence for ${milestoneName}`}
            className="w-full max-h-72 object-contain bg-slate-50"
          />
        ) : (
          <div className="p-4 text-xs text-slate-500">
            {item.is_processed
              ? "Preview not available for this media type."
              : "Still processing — try again shortly."}
          </div>
        )}
      </div>

      {item.student_notes && (
        <p className="text-xs text-slate-600 italic line-clamp-2">
          “{item.student_notes}”
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
          disabled={downloading || !item.file_url}
        >
          {downloading ? "Preparing…" : "Download"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onOverride}>
          Override review
        </Button>
      </div>
    </Card>
  );
}
