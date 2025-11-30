"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

// Define Member type based on backend response
interface Member {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    swim_level: string;
    location_preference: string[];
    registration_complete: boolean;
    is_active: boolean;
}

export default function AdminMembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        swim_level: "Beginner",
        location_preference: "Ikoyi",
    });

    const fetchMembers = async () => {
        try {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setError("Not authenticated");
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/v1/members/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch members");
            const data = await res.json();
            setMembers(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            swim_level: "Beginner",
            location_preference: "Ikoyi",
        });
    };

    const openCreateModal = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };

    const openEditModal = (member: Member) => {
        setEditingMember(member);
        setFormData({
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            phone: member.phone || "",
            swim_level: member.swim_level || "Beginner",
            location_preference: Array.isArray(member.location_preference)
                ? member.location_preference[0]
                : member.location_preference || "Ikoyi",
        });
        setIsEditModalOpen(true);
    };

    const handleCreateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Generate a placeholder auth_id since this is admin-created
            const auth_id = `admin-created-${crypto.randomUUID()}`;

            const payload = {
                ...formData,
                auth_id,
                location_preference: [formData.location_preference], // Backend expects list
                registration_complete: true,
            };

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/members/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Failed to create member");
            }

            await fetchMembers();
            setIsCreateModalOpen(false);
            resetForm();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to create member");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMember) return;

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                location_preference: [formData.location_preference], // Backend expects list
            };

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/members/${editingMember.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Failed to update member");
            }

            await fetchMembers();
            setIsEditModalOpen(false);
            setEditingMember(null);
            resetForm();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update member");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Admin</p>
                    <h1 className="text-4xl font-bold text-slate-900">Members</h1>
                    <p className="text-sm text-slate-600">Manage community members.</p>
                </div>
                <Button onClick={openCreateModal}>Create Member</Button>
            </header>

            <Card>
                {isLoading ? (
                    <div className="p-4 text-center text-slate-500">Loading members...</div>
                ) : error ? (
                    <div className="p-4 text-center text-red-500">Error: {error}</div>
                ) : members.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No members found. Create one to get started.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Name</th>
                                    <th className="px-4 py-3 font-semibold">Contact</th>
                                    <th className="px-4 py-3 font-semibold">Level</th>
                                    <th className="px-4 py-3 font-semibold">Location</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {members.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {member.first_name} {member.last_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span>{member.email}</span>
                                                <span className="text-xs text-slate-400">{member.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{member.swim_level}</td>
                                        <td className="px-4 py-3">
                                            {Array.isArray(member.location_preference)
                                                ? member.location_preference.join(", ")
                                                : member.location_preference}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${member.registration_complete
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-yellow-50 text-yellow-700"
                                                    }`}
                                            >
                                                {member.registration_complete ? "Active" : "Pending"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => openEditModal(member)}
                                                className="text-cyan-600 hover:text-cyan-800 hover:underline"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Member"
            >
                <form onSubmit={handleCreateMember} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="Phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Swim Level"
                            name="swim_level"
                            value={formData.swim_level}
                            onChange={handleInputChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Pro">Pro</option>
                        </Select>
                        <Select
                            label="Location Preference"
                            name="location_preference"
                            value={formData.location_preference}
                            onChange={handleInputChange}
                        >
                            <option value="Ikoyi">Ikoyi</option>
                            <option value="Lekki">Lekki</option>
                            <option value="V.I.">V.I.</option>
                            <option value="Ikeja">Ikeja</option>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Member"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Member"
            >
                <form onSubmit={handleUpdateMember} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            required
                        />
                        <Input
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled // Email usually shouldn't be changed easily
                        hint="Email cannot be changed"
                    />
                    <Input
                        label="Phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Swim Level"
                            name="swim_level"
                            value={formData.swim_level}
                            onChange={handleInputChange}
                        >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="Pro">Pro</option>
                        </Select>
                        <Select
                            label="Location Preference"
                            name="location_preference"
                            value={formData.location_preference}
                            onChange={handleInputChange}
                        >
                            <option value="Ikoyi">Ikoyi</option>
                            <option value="Lekki">Lekki</option>
                            <option value="V.I.">V.I.</option>
                            <option value="Ikeja">Ikeja</option>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
