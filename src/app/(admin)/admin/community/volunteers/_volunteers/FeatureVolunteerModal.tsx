"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import type { VolunteerProfile } from "@/lib/volunteers";
import { Star } from "lucide-react";

export type FeatureForm = {
  spotlight_quote: string;
  featured_until: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  target: VolunteerProfile | null;
  featureForm: FeatureForm;
  setFeatureForm: React.Dispatch<React.SetStateAction<FeatureForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function FeatureVolunteerModal({
  isOpen,
  onClose,
  target,
  featureForm,
  setFeatureForm,
  onSubmit,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Feature Volunteer">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-cyan-50 px-4 py-3">
          <Star className="h-5 w-5 text-cyan-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {target?.member_name || "Unknown"}
            </p>
            <p className="text-xs text-slate-500">
              {target?.total_hours.toFixed(0)}h volunteered &middot;{" "}
              {target?.total_sessions_volunteered} sessions
            </p>
          </div>
        </div>

        <Textarea
          label="Spotlight Quote"
          value={featureForm.spotlight_quote}
          onChange={(e) =>
            setFeatureForm({
              ...featureForm,
              spotlight_quote: e.target.value,
            })
          }
          rows={3}
          placeholder="A short quote from this volunteer (optional)..."
        />

        <Input
          label="Featured Until (optional)"
          type="date"
          value={featureForm.featured_until}
          onChange={(e) =>
            setFeatureForm({ ...featureForm, featured_until: e.target.value })
          }
        />
        <p className="text-xs text-slate-400 -mt-3">
          Leave empty for indefinite featuring. The currently featured volunteer (if any) will be
          replaced.
        </p>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Feature Volunteer</Button>
        </div>
      </form>
    </Modal>
  );
}
