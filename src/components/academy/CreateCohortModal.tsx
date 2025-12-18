"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { AcademyApi, CohortStatus, type Cohort, type Program } from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { useEffect, useState } from "react";

type CreateCohortModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (cohort: Cohort) => void;
    programs: Program[];
};

type MinimalMember = {
    id: string;
    first_name: string;
    last_name: string;
    coach_profile?: {
        id: string;
    };
};

export function CreateCohortModal({ isOpen, onClose, onSuccess, programs }: CreateCohortModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coaches, setCoaches] = useState<MinimalMember[]>([]);

    const [formData, setFormData] = useState({
        program_id: "",
        name: "",
        start_date: "",
        end_date: "",
        capacity: 10,
        status: CohortStatus.OPEN,
        coach_id: "",
    });

    // Load coaches on mount
    useEffect(() => {
        if (isOpen) {
            apiGet<MinimalMember[]>("/api/v1/members?limit=1000", { auth: true })
                .then((members) => {
                    const coachList = members.filter(m => m.coach_profile);
                    setCoaches(coachList);
                })
                .catch(err => console.error("Failed to load members", err));
        }
    }, [isOpen]);

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
            // Filter out empty coach_id if not selected (or send null if allowed by backend?)
            // Backend expects UUID or null. If empty string sent, conversion might fail.
            const payload = {
                ...formData,
                coach_id: formData.coach_id || undefined,
            };

            const newCohort = await AcademyApi.createCohort(payload);
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
                coach_id: "",
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

                <Select
                    label="Assign Coach (Optional)"
                    value={formData.coach_id}
                    onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                >
                    <option value="">No Coach Assigned</option>
                    {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                        </option>
                    ))}
                </Select>

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
