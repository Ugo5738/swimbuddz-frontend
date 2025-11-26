"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Plus, Calendar, Users, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Event {
    id: string;
    title: string;
    description: string;
    event_type: string;
    location: string;
    start_time: string;
    end_time: string | null;
    max_capacity: number | null;
    tier_access: string;
    rsvp_count?: {
        going: number;
        maybe: number;
        not_going: number;
    };
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        event_type: "social",
        location: "",
        start_time: "",
        end_time: "",
        max_capacity: "",
        tier_access: "community",
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/v1/events/");
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // TODO: Get created_by from auth context
            const createdBy = "temp-admin-id";

            const payload = {
                title: formData.title,
                description: formData.description,
                event_type: formData.event_type,
                location: formData.location,
                start_time: formData.start_time,
                end_time: formData.end_time || null,
                max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
                tier_access: formData.tier_access,
            };

            const response = await fetch(
                `http://localhost:8000/api/v1/events/?created_by=${createdBy}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                setShowCreateModal(false);
                setFormData({
                    title: "",
                    description: "",
                    event_type: "social",
                    location: "",
                    start_time: "",
                    end_time: "",
                    max_capacity: "",
                    tier_access: "community",
                });
                await fetchEvents();
            }
        } catch (error) {
            console.error("Failed to create event:", error);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("Are you sure you want to delete this event?")) return;

        try {
            const response = await fetch(`http://localhost:8000/api/v1/events/${eventId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                await fetchEvents();
            }
        } catch (error) {
            console.error("Failed to delete event:", error);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Event Management</h1>
                    <p className="mt-2 text-slate-600">Create and manage community events</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Event
                </Button>
            </div>

            {/* Create Event Modal */}
            {showCreateModal && (
                <Card className="p-6">
                    <form onSubmit={handleCreateEvent} className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Create New Event</h2>

                        <Input
                            label="Event Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="e.g., Beach Day at Rowe Park"
                        />

                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            rows={3}
                            placeholder="Describe the event..."
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Event Type"
                                value={formData.event_type}
                                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                                required
                            >
                                <option value="social">Social</option>
                                <option value="volunteer">Volunteer</option>
                                <option value="beach_day">Beach Day</option>
                                <option value="watch_party">Watch Party</option>
                                <option value="cleanup">Beach Cleanup</option>
                                <option value="training">Training Session</option>
                            </Select>

                            <Select
                                label="Location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                            >
                                <option value="">Select location</option>
                                <option value="Rowe Park, Yaba">Rowe Park, Yaba</option>
                                <option value="Sunfit, Ago">Sunfit, Ago</option>
                                <option value="Federal Palace Hotel, Victoria Island">
                                    Federal Palace Hotel, Victoria Island
                                </option>
                            </Select>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                label="Start Date & Time"
                                type="datetime-local"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                required
                            />

                            <Input
                                label="End Date & Time (Optional)"
                                type="datetime-local"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                label="Max Capacity (Optional)"
                                type="number"
                                value={formData.max_capacity}
                                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                                placeholder="Leave blank for unlimited"
                            />

                            <Select
                                label="Tier Access"
                                value={formData.tier_access}
                                onChange={(e) => setFormData({ ...formData, tier_access: e.target.value })}
                                required
                            >
                                <option value="community">Community (All Members)</option>
                                <option value="club">Club Members Only</option>
                                <option value="academy">Academy Members Only</option>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Event</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Events List */}
            {loading ? (
                <div className="py-12 text-center text-slate-600">Loading events...</div>
            ) : events.length === 0 ? (
                <Card className="p-12 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No events created yet</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Create your first event to get started!
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {events.map((event) => (
                        <Card key={event.id} className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
                                        <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                                        </div>
                                        <div>
                                            <span className="font-medium">Location:</span> {event.location}
                                        </div>
                                        <div>
                                            <span className="font-medium">Type:</span> {event.event_type}
                                        </div>
                                        {event.max_capacity && (
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                {event.rsvp_count?.going || 0} / {event.max_capacity}
                                            </div>
                                        )}
                                    </div>

                                    {event.rsvp_count && (
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-emerald-700">
                                                <strong>{event.rsvp_count.going}</strong> going
                                            </span>
                                            <span className="text-amber-700">
                                                <strong>{event.rsvp_count.maybe}</strong> maybe
                                            </span>
                                            <span className="text-slate-700">
                                                <strong>{event.rsvp_count.not_going}</strong> can't go
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="secondary"
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
