"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface Session {
    id: string;
    title: string;
    session_type?: "club" | "academy" | "community" | "cohort_class" | "one_on_one" | "group_booking" | "event";
    location: string;
    starts_at: string;
    ends_at: string;
    pool_fee: number;
    capacity: number;
    description?: string;
    template_id?: string;
    is_recurring_instance?: boolean;
}

export { SessionDetailsModal };

// Session Details Modal with Ride Share Info
function SessionDetailsModal({
    session,
    onClose,
    onDelete,
    onEdit
}: {
    session: Session;
    onClose: () => void;
    onDelete: (sessionId: string) => void;
    onEdit: (session: Session) => void;
}) {
    const [rideConfigs, setRideConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSession, setEditingSession] = useState(false);
    const [editingRideShare, setEditingRideShare] = useState(false);

    // Editable session fields
    const [sessionData, setSessionData] = useState({
        title: session.title,
        location: session.location,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
        capacity: session.capacity,
        description: session.description || ""
    });

    // Editable ride configs
    const [editableRideConfigs, setEditableRideConfigs] = useState<any[]>([]);

    useEffect(() => {
        fetchRideConfigs();
    }, [session.id]);

    useEffect(() => {
        setEditableRideConfigs(rideConfigs);
    }, [rideConfigs]);

    const fetchRideConfigs = async () => {
        try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            const token = authSession?.access_token;

            const res = await fetch(`${API_BASE_URL}/api/v1/transport/sessions/${session.id}/ride-configs`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                const configs = await res.json();
                setRideConfigs(configs);
            }
        } catch (err) {
            console.error("Failed to fetch ride configs", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Session Details"
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-700">Title</p>
                        <p className="text-slate-900">{session.title}</p>
                    </div>
                    <div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${session.session_type === 'club' ? 'bg-cyan-100 text-cyan-800' :
                            session.session_type === 'academy' ? 'bg-purple-100 text-purple-800' :
                                'bg-emerald-100 text-emerald-800'
                            }`}>
                            {session.session_type ? session.session_type.toUpperCase() : 'COMMUNITY'}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-700">Location</p>
                        <p className="text-slate-900">{session.location}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700">Capacity</p>
                        <p className="text-slate-900">{session.capacity} swimmers</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-slate-700">Start Time</p>
                        <p className="text-slate-900">
                            {new Date(session.starts_at).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700">End Time</p>
                        <p className="text-slate-900">
                            {new Date(session.ends_at).toLocaleString()}
                        </p>
                    </div>
                </div>
                {session.description && (
                    <div>
                        <p className="text-sm font-medium text-slate-700">Description</p>
                        <p className="text-slate-900">{session.description}</p>
                    </div>
                )}

                {/* Ride Share Information */}
                <div className="border-t pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Ride Share Options</p>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading ride share info...</p>
                    ) : rideConfigs.length > 0 ? (
                        <div className="space-y-2">
                            {rideConfigs.map((config, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-900">{config.ride_area_name}</p>
                                            <p className="text-sm text-slate-600">
                                                Cost: ₦{config.cost} · Capacity: {config.capacity} seats
                                            </p>
                                            {config.departure_time && (
                                                <p className="text-xs text-slate-500">
                                                    Departs: {new Date(config.departure_time).toLocaleTimeString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {config.pickup_locations && config.pickup_locations.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-slate-700 mb-1">Pickup locations:</p>
                                            <ul className="text-xs text-slate-600 space-y-0.5">
                                                {config.pickup_locations.map((loc: any, idx: number) => (
                                                    <li key={idx}>• {loc.name}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">No ride share options configured</p>
                    )}
                </div>

                {session.is_recurring_instance && (
                    <Alert variant="info" title="Recurring Session">
                        This session was generated from a template
                    </Alert>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                    <Button variant="outline" onClick={() => onEdit(session)}>
                        Edit
                    </Button>
                    <Button variant="danger" onClick={() => onDelete(session.id)}>
                        Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
