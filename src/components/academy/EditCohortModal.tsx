"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademyApi, CohortStatus, type Cohort } from "@/lib/academy";

type EditCohortModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (cohort: Cohort) => void;
    cohort: Cohort;
};

export function EditCohortModal({ isOpen, onClose, onSuccess, cohort }: EditCohortModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: cohort.name,
        start_date: cohort.start_date.split('T')[0],
        end_date: cohort.end_date.split('T')[0],
        capacity: cohort.capacity,
        status: cohort.status,
    });

    // Update form data when cohort changes
    useEffect(() => {
        setFormData({
            name: cohort.name,
            start_date: cohort.start_date.split('T')[0],
            end_date: cohort.end_date.split('T')[0],
            capacity: cohort.capacity,
            status: cohort.status,
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Capacity"
                        type="number"
                        min={1}
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                        required
                    />

                    <Select
                        label="Status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as CohortStatus })}
                    >
                        {Object.values(CohortStatus).map((status) => (
                            <option key={status} value={status}>
                                {status.toUpperCase()}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
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
