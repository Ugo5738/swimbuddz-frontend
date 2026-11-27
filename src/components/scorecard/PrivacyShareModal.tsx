"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { type ScorecardSettings, updateMyScorecardSettings } from "@/lib/scorecard";
import { Copy, ExternalLink, Lock, RefreshCw, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  settings: ScorecardSettings;
  onUpdated: (updated: ScorecardSettings) => void;
};

export function PrivacyShareModal({ isOpen, onClose, settings, onUpdated }: Props) {
  const [podVis, setPodVis] = useState(settings.pod_visibility_enabled);
  const [podBench, setPodBench] = useState(settings.show_benchmarks_to_pod);
  const [dirHighlights, setDirHighlights] = useState(
    settings.directory_highlights_enabled,
  );
  const [publicShare, setPublicShare] = useState(settings.public_share_card_enabled);
  const [prefPoolLen, setPrefPoolLen] = useState(
    settings.preferred_pool_length_m ? String(settings.preferred_pool_length_m) : "25",
  );
  const [shareToken, setShareToken] = useState(settings.share_token);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPodVis(settings.pod_visibility_enabled);
    setPodBench(settings.show_benchmarks_to_pod);
    setDirHighlights(settings.directory_highlights_enabled);
    setPublicShare(settings.public_share_card_enabled);
    setPrefPoolLen(
      settings.preferred_pool_length_m ? String(settings.preferred_pool_length_m) : "25",
    );
    setShareToken(settings.share_token);
  }, [settings, isOpen]);

  const shareUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/scorecard/${shareToken}`
      : shareToken
        ? `/scorecard/${shareToken}`
        : null;

  const save = async (rotateToken = false) => {
    setSaving(true);
    try {
      const updated = await updateMyScorecardSettings({
        pod_visibility_enabled: podVis,
        show_benchmarks_to_pod: podVis ? podBench : false,
        directory_highlights_enabled: dirHighlights,
        public_share_card_enabled: publicShare,
        preferred_pool_length_m: prefPoolLen ? Number(prefPoolLen) : undefined,
        rotate_share_token: rotateToken,
      });
      setShareToken(updated.share_token);
      onUpdated(updated);
      toast.success(
        rotateToken ? "Generated a fresh share link." : "Privacy preferences saved.",
      );
      if (!rotateToken) onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scorecard Privacy & Sharing" size="wide">
      <div className="space-y-5">
        {/* Clear Privacy Guarantee */}
        <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 space-y-1.5 border border-slate-200">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-cyan-700" />
            What always stays private
          </p>
          <p>
            Your Stroke Lab AI diagnostics &amp; videos, personal reflection notes, coach
            feedback notes, skills still marked <em>Learning</em>, and raw attendance /
            punctuality rates are <strong>never</strong> shown to peers or on public share
            cards.
          </p>
        </div>

        {/* Pod visibility */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-cyan-600" />
            Pod &amp; Community Visibility
          </h3>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={podVis}
              onChange={(e) => setPodVis(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Show positive verified highlights to my Pod-mates
              </p>
              <p className="text-xs text-slate-500">
                Shares your verified strokes unlocked, Club Ready badge, and positive
                recognition with members of your active Pod.
              </p>
            </div>
          </label>

          {podVis && (
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 ml-5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={podBench}
                onChange={(e) => setPodBench(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Also share my verified distance &amp; pace PBs with Pod-mates
                </p>
                <p className="text-xs text-slate-500">
                  Helpful for lane matching during Saturday Club sets. Only Coach/Pod-verified
                  PBs are shown.
                </p>
              </div>
            </label>
          )}

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={dirHighlights}
              onChange={(e) => setDirHighlights(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Show verified stroke badges in Member Directory
              </p>
              <p className="text-xs text-slate-500">
                Opt-in to display your unlocked verified strokes on your directory listing.
              </p>
            </div>
          </label>
        </div>

        {/* Public Share Card */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-600" />
            Shareable Public Milestone Card (Opt-in)
          </h3>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={publicShare}
              onChange={(e) => setPublicShare(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Enable my shareable Swim Scorecard link
              </p>
              <p className="text-xs text-slate-500">
                Creates a clean, read-only highlight page showing only your verified strokes,
                top verified distance/efficiency, and lifetime pool hours. Turn off anytime.
              </p>
            </div>
          </label>

          {publicShare && shareUrl && (
            <div className="rounded-lg bg-emerald-50/70 p-3 space-y-2 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-900">
                Your live share link:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 truncate rounded bg-white px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-emerald-200">
                  {shareUrl}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void copyShareUrl()}
                  className="gap-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-cyan-700 hover:bg-slate-50"
                >
                  Preview
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void save(true)}
                  className="gap-1 text-slate-600"
                  title="Revoke old link and generate a new token"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rotate
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Default pool length preference */}
        <div className="border-t border-slate-100 pt-4">
          <Input
            label="Default pool length for logging (meters)"
            type="number"
            step="0.5"
            min={5}
            max={100}
            value={prefPoolLen}
            onChange={(e) => setPrefPoolLen(e.target.value)}
            hint="Pre-fills when you log SPL, SWOLF, or timed swims."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save(false)} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
