"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiEndpoints } from "@/lib/config";
import { Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface VolunteerRole {
    id: string;
    title: string;
    description: string;
    category: string;
    is_active: boolean;
    slots_available: number | null;
    interested_count: number;
}

export default function AdminVolunteersPage() {
    const [roles, setRoles] = useState<VolunteerRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "event_logistics",
        slots_available: "",
        is_active: true,
    });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await fetch(
                `${apiEndpoints.volunteers}/roles?active_only=false`
            );
            if (response.ok) {
                const data = await response.json();
                setRoles(data);
            }
        } catch (error) {
            console.error("Failed to fetch volunteer roles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                slots_available: formData.slots_available ? parseInt(formData.slots_available) : null,
                is_active: formData.is_active,
            };

            const response = await fetch(`${apiEndpoints.volunteers}/roles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setShowCreateModal(false);
                setFormData({
                    title: "",
                    description: "",
                    category: "event_logistics",
                    slots_available: "",
                    is_active: true,
                });
                await fetchRoles();
            }
        } catch (error) {
            console.error("Failed to create role:", error);
        }
    };

    const handleToggleActive = async (roleId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(
                `${apiEndpoints.volunteers}/roles/${roleId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_active: !currentStatus }),
                }
            );

            if (response.ok) {
                await fetchRoles();
            }
        } catch (error) {
            console.error("Failed to toggle role status:", error);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!confirm("Are you sure you want to delete this volunteer role?")) return;

        try {
            const response = await fetch(
                `${apiEndpoints.volunteers}/roles/${roleId}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                await fetchRoles();
            }
        } catch (error) {
            console.error("Failed to delete role:", error);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Volunteer Role Management</h1>
                    <p className="mt-2 text-slate-600">Create and manage volunteer opportunities</p>
                </div>
                {!showCreateModal && (
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 w-fit">
                        <Plus className="h-4 w-4" />
                        Create Role
                    </Button>
                )}
            </div>

            {/* Create Role Modal */}
            {showCreateModal && (
                <Card className="p-6">
                    <form onSubmit={handleCreateRole} className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Create Volunteer Role</h2>

                        <Input
                            label="Role Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="e.g., Event Photographer"
                        />

                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            rows={3}
                            placeholder="Describe the role responsibilities..."
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                <option value="event_logistics">Event Logistics</option>
                                <option value="peer_mentor">Peer Mentor</option>
                                <option value="social_ambassador">Social Ambassador</option>
                                <option value="media">Media & Photography</option>
                                <option value="lane_marshal">Lane Marshal</option>
                                <option value="coaching_support">Coaching Assistant</option>
                                <option value="admin">Administrative</option>
                            </Select>

                            <Input
                                label="Slots Available (Optional)"
                                type="number"
                                value={formData.slots_available}
                                onChange={(e) =>
                                    setFormData({ ...formData, slots_available: e.target.value })
                                }
                                placeholder="Leave blank for unlimited"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                                Active (visible to members)
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
                            <Button type="submit">Create Role</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Roles List */}
            {loading ? (
                <div className="py-12 text-center text-slate-600">Loading roles...</div>
            ) : roles.length === 0 && !showCreateModal ? (
                <Card className="p-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No roles created yet</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Create your first volunteer role to get started!
                    </p>
                </Card>
            ) : roles.length > 0 ? (
                <div className="space-y-4">
                    {roles.map((role) => (
                        <Card key={role.id} className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-slate-900">{role.title}</h3>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${role.is_active
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {role.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-700">{role.description}</p>

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                        <div>
                                            <span className="font-medium">Category:</span> {role.category}
                                        </div>
                                        <div>
                                            <span className="font-medium">Interested:</span> {role.interested_count}
                                        </div>
                                        {role.slots_available && (
                                            <div>
                                                <span className="font-medium">Slots:</span> {role.interested_count} /{" "}
                                                {role.slots_available}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleToggleActive(role.id, role.is_active)}
                                    >
                                        {role.is_active ? "Deactivate" : "Activate"}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
