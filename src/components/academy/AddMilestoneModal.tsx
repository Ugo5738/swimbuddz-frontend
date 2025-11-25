"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AcademyApi, type Milestone } from "@/lib/academy";

type AddMilestoneModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (milestone: Milestone) => void;
    programId: string;
};

export function AddMilestoneModal({ isOpen, onClose, onSuccess, programId }: AddMilestoneModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        criteria: "",
        video_url: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const milestoneData = {
                program_id: programId,
                name: formData.name,
                criteria: formData.criteria || undefined,
                video_url: formData.video_url || undefined,
            };

            const newMilestone = await AcademyApi.createMilestone(milestoneData);
            onSuccess(newMilestone);
            onClose();
            // Reset form
            setFormData({
                name: "",
                criteria: "",
                video_url: "",
            });
        } catch (err) {
            console.error(err);
            setError("Failed to add milestone. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Milestone">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-red-600">{error}</div>}

                <Input
                    label="Milestone Name"
                    placeholder="e.g., Float for 30 seconds"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />

                <Textarea
                    label="Criteria (Optional)"
                    placeholder="Describe what the student needs to demonstrate..."
                    value={formData.criteria}
                    onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                />

                <Input
                    label="Video URL (Optional)"
                    placeholder="https://..."
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Adding..." : "Add Milestone"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
