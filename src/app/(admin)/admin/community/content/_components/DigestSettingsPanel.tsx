"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { apiGet, apiPatch } from "@/lib/api";
import { BarChart3, ImageIcon, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

type Audience = "community" | "club" | "academy";

interface DigestConfig {
  id: string;
  audience: Audience;
  featured_image_media_id: string | null;
  featured_image_url: string | null;
  image_alt: string;
  section_intro: string | null;
  default_gear_notes: string | null;
  is_enabled: boolean;
  updated_at: string;
}

interface DigestStats {
  campaign_key: string | null;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  uncertain: number;
  recipients_clicked: number;
  total_clicks: number;
  bookings_started: number;
  bookings_confirmed: number;
}

const AUDIENCE_LABELS: Record<Audience, string> = {
  community: "Community",
  club: "Club",
  academy: "Academy",
};

export function DigestSettingsPanel() {
  const [configs, setConfigs] = useState<DigestConfig[]>([]);
  const [stats, setStats] = useState<DigestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Audience | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configData, statsData] = await Promise.all([
        apiGet<DigestConfig[]>(
          "/api/v1/communications/digest/admin/configs",
          { auth: true },
        ),
        apiGet<DigestStats>("/api/v1/communications/digest/admin/stats", {
          auth: true,
        }),
      ]);
      setConfigs(configData);
      setStats(statsData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load digest settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateLocal = (audience: Audience, patch: Partial<DigestConfig>) => {
    setConfigs((current) =>
      current.map((config) =>
        config.audience === audience ? { ...config, ...patch } : config,
      ),
    );
  };

  const save = async (config: DigestConfig) => {
    setSaving(config.audience);
    setError(null);
    try {
      const updated = await apiPatch<DigestConfig>(
        `/api/v1/communications/digest/admin/configs/${config.audience}`,
        {
          featured_image_media_id: config.featured_image_media_id,
          image_alt: config.image_alt,
          section_intro: config.section_intro,
          default_gear_notes: config.default_gear_notes,
          is_enabled: config.is_enabled,
        },
        { auth: true },
      );
      updateLocal(config.audience, updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save digest settings");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card className="flex min-h-32 items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-cyan-700" />
            <h2 className="text-lg font-semibold text-slate-900">Weekly digest</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Section images, preparation notes, and latest delivery reporting.
          </p>
        </div>
        {stats?.campaign_key && (
          <div className="text-right text-xs text-slate-500">
            <div className="flex items-center justify-end gap-1 font-medium text-slate-700">
              <BarChart3 className="h-4 w-4" />
              {stats.campaign_key}
            </div>
            <p className="mt-1">
              {stats.sent}/{stats.total} sent · {stats.recipients_clicked} recipients clicked
            </p>
            <p className="mt-1">
              {stats.bookings_confirmed}/{stats.bookings_started} attributed bookings confirmed
            </p>
            {(stats.failed > 0 || stats.uncertain > 0) && (
              <p className="mt-1 text-amber-700">
                {stats.failed} failed · {stats.uncertain} need review
              </p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="divide-y divide-slate-200">
        {configs.map((config) => (
          <section key={config.audience} className="grid gap-5 py-5 lg:grid-cols-[280px_1fr]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">
                  {AUDIENCE_LABELS[config.audience]}
                </h3>
                <Checkbox
                  label="Include"
                  checked={config.is_enabled}
                  onChange={(event) =>
                    updateLocal(config.audience, { is_enabled: event.target.checked })
                  }
                />
              </div>
              <MediaInput
                label={`${AUDIENCE_LABELS[config.audience]} section image`}
                purpose="content_image"
                mode="both"
                value={config.featured_image_media_id}
                onChange={(mediaId, fileUrl) =>
                  updateLocal(config.audience, {
                    featured_image_media_id: mediaId,
                    featured_image_url: fileUrl || null,
                  })
                }
              />
            </div>

            <div className="space-y-3">
              <Input
                label="Image description"
                value={config.image_alt}
                onChange={(event) =>
                  updateLocal(config.audience, { image_alt: event.target.value })
                }
              />
              <label className="block text-sm font-medium text-slate-700">
                Section introduction
                <textarea
                  rows={2}
                  value={config.section_intro || ""}
                  onChange={(event) =>
                    updateLocal(config.audience, { section_intro: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                What to bring
                <textarea
                  rows={2}
                  value={config.default_gear_notes || ""}
                  onChange={(event) =>
                    updateLocal(config.audience, { default_gear_notes: event.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </label>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save(config)}
                  disabled={saving === config.audience || config.image_alt.trim().length < 3}
                >
                  {saving === config.audience ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save {AUDIENCE_LABELS[config.audience]}
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}
