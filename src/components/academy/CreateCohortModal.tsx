"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademyApi, CohortStatus, type Cohort, type Program } from "@/lib/academy";

type CreateCohortModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (cohort: Cohort) => void;
    programs: Program[];
};

export function CreateCohortModal({ isOpen, onClose, onSuccess, programs }: CreateCohortModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        program_id: "",
        name: "",
        start_date: "",
        end_date: "",
        capacity: 10,
        status: CohortStatus.OPEN,
    });

    // Set default program_id when programs load
    useEffect(() => {
        if (programs.length > 0 && !formData.program_id) {
            setFormData(prev => ({ ...prev, program_id: programs[0].id }));
        }
    }, [programs, formData.program_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const newCohort = await AcademyApi.createCohort(formData);
            onSuccess(newCohort);
            onClose();
            // Reset form
            setFormData({
                program_id: programs[0]?.id || "",
                name: "",
                start_date: "",
                end_date: "",
                capacity: 10,
                status: CohortStatus.OPEN,
            });
        } catch (err) {
            console.error(err);
            setError("Failed to create cohort. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Cohort">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-red-600">{error}</div>}

                <Select
                    label="Program"
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                    required
                >
                    <option value="" disabled>Select a program</option>
                    {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </Select>

                <Input
                    label="Cohort Name (e.g. Batch A)"
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
                        {loading ? "Creating..." : "Create Cohort"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
