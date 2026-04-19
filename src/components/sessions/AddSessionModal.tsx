"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { SessionsApi, SessionType, type Session } from "@/lib/sessions";
import { useState } from "react";

type AddSessionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: Session) => void;
  cohortId: string;
  cohortTimezone?: string;
  cohortLocationName?: string;
  /** Cohort's default pool — used to pre-select the PoolPicker. */
  cohortPoolId?: string | null;
};

export function AddSessionModal({
  isOpen,
  onClose,
  onSuccess,
  cohortId,
  cohortTimezone = "Africa/Lagos",
  cohortLocationName = "",
  cohortPoolId = null,
}: AddSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDefaultDate = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    week_number: 1,
    lesson_title: "",
    date: getDefaultDate(),
    start_time: "09:00",
    end_time: "10:00",
    // Pre-fill with the cohort's pool so the admin doesn't have to re-pick
    // when adding an ad-hoc session.
    pool_id: cohortPoolId,
    location_name: cohortLocationName,
    capacity: 10,
    pool_fee: 0,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Combine date and time
      const starts_at = `${formData.date}T${formData.start_time}:00`;
      const ends_at = `${formData.date}T${formData.end_time}:00`;

      const newSession = await SessionsApi.createSession({
        title: formData.title || `Week ${formData.week_number} Session`,
        description: formData.description || undefined,
        session_type: SessionType.COHORT_CLASS,
        cohort_id: cohortId,
        week_number: formData.week_number,
        lesson_title: formData.lesson_title || undefined,
        starts_at,
        ends_at,
        timezone: cohortTimezone,
        pool_id: formData.pool_id,
        location_name: formData.location_name || undefined,
        capacity: formData.capacity,
        pool_fee: formData.pool_fee,
        notes: formData.notes || undefined,
      });

      onSuccess(newSession);
      onClose();

      // Reset form (keep pool_id pre-filled with the cohort's default)
      setFormData({
        title: "",
        description: "",
        week_number: formData.week_number + 1,
        lesson_title: "",
        date: getDefaultDate(),
        start_time: "09:00",
        end_time: "10:00",
        pool_id: cohortPoolId,
        location_name: cohortLocationName,
        capacity: 10,
        pool_fee: 0,
        notes: "",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Session">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Week Number"
            type="number"
            min={1}
            value={formData.week_number}
            onChange={(e) =>
              setFormData({
                ...formData,
                week_number: parseInt(e.target.value) || 1,
              })
            }
            required
          />
          <Input
            label="Lesson Title"
            value={formData.lesson_title}
            onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })}
            placeholder="e.g., Freestyle Basics"
          />
        </div>

        <Input
          label="Session Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Leave blank for auto-generated title"
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Session description..."
        />

        <Input
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            required
          />
        </div>

        <PoolPicker
          label="Pool"
          value={formData.pool_id}
          onChange={(poolId, poolName) =>
            setFormData({
              ...formData,
              pool_id: poolId,
              location_name: poolName ?? "",
            })
          }
          hint="Defaults to this cohort's pool. Override if this one-off session is at a different pool."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Capacity"
            type="number"
            min={1}
            value={formData.capacity}
            onChange={(e) =>
              setFormData({
                ...formData,
                capacity: parseInt(e.target.value) || 10,
              })
            }
          />
          <Input
            label="Pool Fee"
            type="number"
            min={0}
            value={formData.pool_fee}
            onChange={(e) =>
              setFormData({
                ...formData,
                pool_fee: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>

        <Textarea
          label="Internal Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes for coaches/admins..."
        />

        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Add Session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
