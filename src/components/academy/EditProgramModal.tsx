"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { AcademyApi, ProgramLevel, BillingType, type Program } from "@/lib/academy";

type EditProgramModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (program: Program) => void;
    program: Program;
};

export function EditProgramModal({ isOpen, onClose, onSuccess, program }: EditProgramModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: program.name,
        description: program.description || "",
        level: program.level,
        duration_weeks: program.duration_weeks,
        default_capacity: program.default_capacity || 10,
        currency: program.currency || "NGN",
        price_amount: program.price_amount || 0,
        billing_type: program.billing_type || BillingType.ONE_TIME,
        is_published: program.is_published || false,
        curriculum_json: program.curriculum_json || null,
    });
    const [curriculumText, setCurriculumText] = useState("");
    const [curriculumError, setCurriculumError] = useState<string | null>(null);

    // Update form data when program changes
    useEffect(() => {
        setFormData({
            name: program.name,
            description: program.description || "",
            level: program.level,
            duration_weeks: program.duration_weeks,
            default_capacity: program.default_capacity || 10,
            currency: program.currency || "NGN",
            price_amount: program.price_amount || 0,
            billing_type: program.billing_type || BillingType.ONE_TIME,
            is_published: program.is_published || false,
            curriculum_json: program.curriculum_json || null,
        });
        // Format JSON for display
        if (program.curriculum_json) {
            try {
                setCurriculumText(JSON.stringify(program.curriculum_json, null, 2));
            } catch {
                setCurriculumText("");
            }
        } else {
            setCurriculumText("");
        }
        setCurriculumError(null);
    }, [program]);

    const handleCurriculumChange = (value: string) => {
        setCurriculumText(value);
        setCurriculumError(null);

        if (!value.trim()) {
            setFormData({ ...formData, curriculum_json: null });
            return;
        }

        try {
            const parsed = JSON.parse(value);
            setFormData({ ...formData, curriculum_json: parsed });
        } catch (e) {
            setCurriculumError("Invalid JSON format");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (curriculumError) {
            setError("Please fix the curriculum JSON before saving.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const updatedProgram = await AcademyApi.updateProgram(program.id, formData);
            onSuccess(updatedProgram);
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to update program. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Program">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Default Capacity"
                        type="number"
                        min={1}
                        value={formData.default_capacity}
                        onChange={(e) => setFormData({ ...formData, default_capacity: parseInt(e.target.value) || 10 })}
                        required
                    />

                    <Select
                        label="Billing Type"
                        value={formData.billing_type}
                        onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as BillingType })}
                    >
                        <option value={BillingType.ONE_TIME}>One-Time</option>
                        <option value={BillingType.SUBSCRIPTION}>Subscription</option>
                        <option value={BillingType.PER_SESSION}>Per Session</option>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                        <option value="NGN">NGN (₦)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                    </Select>

                    <Input
                        label="Price (smallest unit)"
                        type="number"
                        min={0}
                        value={formData.price_amount}
                        onChange={(e) => setFormData({ ...formData, price_amount: parseInt(e.target.value) || 0 })}
                        placeholder="e.g., 2000000 for ₦20,000"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_published"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="is_published" className="text-sm text-slate-700">
                        Published (visible to students)
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Curriculum (JSON)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                        Define the program curriculum as JSON. Example: {`{"week1": ["Water confidence", "Breathing"], "week2": ["Floating", "Kicking"]}`}
                    </p>
                    <textarea
                        value={curriculumText}
                        onChange={(e) => handleCurriculumChange(e.target.value)}
                        rows={6}
                        className={`w-full rounded-lg border px-4 py-2 font-mono text-sm focus:outline-none ${curriculumError
                            ? "border-red-300 focus:border-red-500"
                            : "border-slate-300 focus:border-cyan-500"
                            }`}
                        placeholder='{"week1": ["Topic 1", "Topic 2"], "week2": ["Topic 3"]}'
                    />
                    {curriculumError && (
                        <p className="text-xs text-red-600 mt-1">{curriculumError}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading || !!curriculumError}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
