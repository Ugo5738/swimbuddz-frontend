"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Plus, Trophy, Trash2 } from "lucide-react";
import { apiEndpoints } from "@/lib/config";

interface ClubChallenge {
    id: string;
    title: string;
    description: string;
    badge_icon_url: string | null;
    is_active: boolean;
    completion_count: number;
}

export default function AdminChallengesPage() {
    const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        badge_icon_url: "",
        is_active: true,
    });

    useEffect(() => {
        fetchChallenges();
    }, []);

    const fetchChallenges = async () => {
        try {
            const response = await fetch(
                `${apiEndpoints.challenges}?active_only=false`
            );
            if (response.ok) {
                const data = await response.json();
                setChallenges(data);
            }
        } catch (error) {
            console.error("Failed to fetch challenges:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChallenge = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                badge_icon_url: formData.badge_icon_url || null,
                is_active: formData.is_active,
            };

            const response = await fetch(`${apiEndpoints.challenges}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setShowCreateModal(false);
                setFormData({
                    title: "",
                    description: "",
                    badge_icon_url: "",
                    is_active: true,
                });
                await fetchChallenges();
            }
        } catch (error) {
            console.error("Failed to create challenge:", error);
        }
    };

    const handleToggleActive = async (challengeId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(
                `${apiEndpoints.challenges}/${challengeId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_active: !currentStatus }),
                }
            );

            if (response.ok) {
                await fetchChallenges();
            }
        } catch (error) {
            console.error("Failed to toggle challenge status:", error);
        }
    };

    const handleDeleteChallenge = async (challengeId: string) => {
        if (!confirm("Are you sure you want to delete this challenge?")) return;

        try {
            const response = await fetch(
                `${apiEndpoints.challenges}/${challengeId}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                await fetchChallenges();
            }
        } catch (error) {
            console.error("Failed to delete challenge:", error);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Club Challenge Management</h1>
                    <p className="mt-2 text-slate-600">Create and manage club challenges & badges</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Challenge
                </Button>
            </div>

            {/* Create Challenge Modal */}
            {showCreateModal && (
                <Card className="p-6">
                    <form onSubmit={handleCreateChallenge} className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Create Club Challenge</h2>

                        <Input
                            label="Challenge Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="e.g., 50km Swimming Challenge"
                        />

                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            rows={3}
                            placeholder="Describe the challenge requirements..."
                        />

                        <Input
                            label="Badge Icon URL (Optional)"
                            value={formData.badge_icon_url}
                            onChange={(e) => setFormData({ ...formData, badge_icon_url: e.target.value })}
                            placeholder="https://example.com/badge-icon.png"
                        />

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                                Active (visible to club members)
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Challenge</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Challenges List */}
            {loading ? (
                <div className="py-12 text-center text-slate-600">Loading challenges...</div>
            ) : challenges.length === 0 ? (
                <Card className="p-12 text-center">
                    <Trophy className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                        No challenges created yet
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Create your first club challenge to get started!
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {challenges.map((challenge) => (
                        <Card key={challenge.id} className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    {challenge.badge_icon_url && (
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                            <img
                                                src={challenge.badge_icon_url}
                                                alt={challenge.title}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-slate-900">
                                                {challenge.title}
                                            </h3>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${challenge.is_active
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-slate-100 text-slate-600"
                                                    }`}
                                            >
                                                {challenge.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-700">{challenge.description}</p>

                                        <div className="text-sm text-slate-600">
                                            <span className="font-medium">Completions:</span>{" "}
                                            {challenge.completion_count}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleToggleActive(challenge.id, challenge.is_active)}
                                    >
                                        {challenge.is_active ? "Deactivate" : "Activate"}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleDeleteChallenge(challenge.id)}
                                        className="text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
