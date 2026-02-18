"use client";

import { ClubReadinessStep } from "@/components/onboarding/ClubReadinessStep";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface ClubReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialData?: {
    availabilitySlots: string[];
    clubNotes: string;
  };
  onSave: (data: {
    available_days: string[];
    club_notes: string;
  }) => Promise<void>;
}

export function ClubReadinessModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
  onSave,
}: ClubReadinessModalProps) {
  const [formData, setFormData] = useState({
    availabilitySlots: initialData?.availabilitySlots || [],
    clubNotes: initialData?.clubNotes || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        availabilitySlots: initialData.availabilitySlots || [],
        clubNotes: initialData.clubNotes || "",
      });
    }
  }, [initialData]);

  const isValid = formData.availabilitySlots.length > 0;

  const handleToggleAvailability = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      availabilitySlots: prev.availabilitySlots.includes(value)
        ? prev.availabilitySlots.filter((v) => v !== value)
        : [...prev.availabilitySlots, value],
    }));
  };

  const handleUpdateNotes = (value: string) => {
    setFormData((prev) => ({ ...prev, clubNotes: value }));
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave({
        available_days: formData.availabilitySlots,
        club_notes: formData.clubNotes,
      });
      onComplete();
    } catch (e) {
      console.error("Failed to save club readiness:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Complete Club Readiness
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4">
            Before upgrading to Club, please tell us your availability so we can
            match you with sessions.
          </p>
          <ClubReadinessStep
            formData={formData}
            onToggleAvailability={handleToggleAvailability}
            onUpdateNotes={handleUpdateNotes}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || saving}>
            {saving ? "Saving..." : "Continue to Billing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
