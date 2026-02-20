"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  AcademyApi,
  CohortStatus,
  LocationType,
  type Cohort,
} from "@/lib/academy";
import { useEffect, useState } from "react";

type EditCohortModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cohort: Cohort) => void;
  cohort: Cohort;
};

export function EditCohortModal({
  isOpen,
  onClose,
  onSuccess,
  cohort,
}: EditCohortModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: cohort.name,
    start_date: cohort.start_date.split("T")[0],
    end_date: cohort.end_date.split("T")[0],
    capacity: cohort.capacity,
    status: cohort.status,
    // New fields
    timezone: cohort.timezone || "Africa/Lagos",
    location_type: cohort.location_type || LocationType.POOL,
    location_name: cohort.location_name || "",
    location_address: cohort.location_address || "",
    notes_internal: cohort.notes_internal || "",
    allow_mid_entry: cohort.allow_mid_entry || false,
    admin_dropout_approval: cohort.admin_dropout_approval || false,
  });

  // Update form data when cohort changes
  useEffect(() => {
    setFormData({
      name: cohort.name,
      start_date: cohort.start_date.split("T")[0],
      end_date: cohort.end_date.split("T")[0],
      capacity: cohort.capacity,
      status: cohort.status,
      timezone: cohort.timezone || "Africa/Lagos",
      location_type: cohort.location_type || LocationType.POOL,
      location_name: cohort.location_name || "",
      location_address: cohort.location_address || "",
      notes_internal: cohort.notes_internal || "",
      allow_mid_entry: cohort.allow_mid_entry || false,
      admin_dropout_approval: cohort.admin_dropout_approval || false,
    });
  }, [cohort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updatedCohort = await AcademyApi.updateCohort(cohort.id, formData);
      onSuccess(updatedCohort);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update cohort. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Cohort">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
      >
        {error && <div className="text-sm text-red-600">{error}</div>}

        <Input
          label="Cohort Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) =>
              setFormData({ ...formData, start_date: e.target.value })
            }
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={formData.capacity}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: parseInt(e.target.value) || 0,
              })
            }
            required
          />

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as CohortStatus,
              })
            }
          >
            {Object.values(CohortStatus).map((status) => (
              <option key={status} value={status}>
                {status.toUpperCase()}
              </option>
            ))}
          </Select>
        </div>

        {/* Location Section */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Location</h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Select
              label="Location Type"
              value={formData.location_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location_type: e.target.value as LocationType,
                })
              }
            >
              <option value={LocationType.POOL}>Pool</option>
              <option value={LocationType.OPEN_WATER}>Open Water</option>
              <option value={LocationType.REMOTE}>Remote/Online</option>
            </Select>

            <Select
              label="Timezone"
              value={formData.timezone}
              onChange={(e) =>
                setFormData({ ...formData, timezone: e.target.value })
              }
            >
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </Select>
          </div>

          <Input
            label="Location Name"
            value={formData.location_name}
            onChange={(e) =>
              setFormData({ ...formData, location_name: e.target.value })
            }
            placeholder="e.g., SunFit Pool, Ikoyi"
          />

          <Input
            label="Location Address"
            value={formData.location_address}
            onChange={(e) =>
              setFormData({ ...formData, location_address: e.target.value })
            }
            placeholder="Full address"
            className="mt-4"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allow_mid_entry"
            checked={formData.allow_mid_entry}
            onChange={(e) =>
              setFormData({ ...formData, allow_mid_entry: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label htmlFor="allow_mid_entry" className="text-sm text-slate-700">
            Allow mid-cohort entry
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="admin_dropout_approval"
            checked={formData.admin_dropout_approval}
            onChange={(e) =>
              setFormData({
                ...formData,
                admin_dropout_approval: e.target.checked,
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label
            htmlFor="admin_dropout_approval"
            className="text-sm text-slate-700"
          >
            Require admin approval for dropouts
          </label>
        </div>

        <Textarea
          label="Internal Notes (staff only)"
          value={formData.notes_internal}
          onChange={(e) =>
            setFormData({ ...formData, notes_internal: e.target.value })
          }
          placeholder="Notes visible only to staff"
        />

        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
