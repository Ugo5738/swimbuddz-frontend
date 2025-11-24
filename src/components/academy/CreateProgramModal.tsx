"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { AcademyApi, ProgramLevel, type Program } from "@/lib/academy";

type CreateProgramModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (program: Program) => void;
};

export function CreateProgramModal({ isOpen, onClose, onSuccess }: CreateProgramModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        level: ProgramLevel.BEGINNER_1,
        duration_weeks: 4,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const newProgram = await AcademyApi.createProgram(formData);
            onSuccess(newProgram);
            onClose();
            // Reset form
            setFormData({
                name: "",
                description: "",
                level: ProgramLevel.BEGINNER_1,
                duration_weeks: 4,
            });
        } catch (err) {
            console.error(err);
            setError("Failed to create program. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Program">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-red-600">{error}</div>}

                <Input
                    label="Program Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />

                <Textarea
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />

                <Select
                    label="Level"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as ProgramLevel })}
                >
                    {Object.values(ProgramLevel).map((level) => (
                        <option key={level} value={level}>
                            {level.replace("_", " ").toUpperCase()}
                        </option>
                    ))}
                </Select>

                <Input
                    label="Duration (Weeks)"
                    type="number"
                    min={1}
                    value={formData.duration_weeks}
                    onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 0 })}
                    required
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Program"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
