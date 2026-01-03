"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { SessionSignIn } from "@/components/sessions/SessionSignIn";
import { getSession, Session, RideShareArea } from "@/lib/sessions";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";

// Type for transport service ride config response
interface RideConfig {
    ride_area_id: string;
    ride_area_name: string;
    cost: number;
    capacity: number;
    pickup_locations: Array<{
        pickup_location_id: string;
        name: string;
        description?: string;
        is_available: boolean;
        max_capacity: number;
        current_bookings: number;
        distance_text?: string;
        duration_text?: string;
        departure_time_calculated?: string;
    }>;
}

export default function SessionSignInPage({ params }: { params: { id: string } }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadSessionData() {
            try {
                // Fetch session data
                const sessionData = await getSession(params.id);

                // Fetch ride share config from transport service
                try {
                    const rideConfigs = await apiGet<RideConfig[]>(
                        `/api/v1/transport/sessions/${params.id}/ride-configs`,
                        { auth: true }
                    );

                    // Transform transport service response to RideShareArea format
                    if (rideConfigs && rideConfigs.length > 0) {
                        sessionData.rideShareAreas = rideConfigs.map((config): RideShareArea => ({
                            id: config.ride_area_id,
                            ride_area_name: config.ride_area_name,
                            cost: config.cost,
                            capacity: config.capacity,
                            pickup_locations: config.pickup_locations.map((loc) => ({
                                id: loc.pickup_location_id,
                                name: loc.name,
                                description: loc.description,
                                is_available: loc.is_available,
                                max_capacity: loc.max_capacity,
                                current_bookings: loc.current_bookings,
                                distance_text: loc.distance_text,
                                duration_text: loc.duration_text,
                                departure_time_calculated: loc.departure_time_calculated,
                            })),
                        }));
                    }
                } catch (transportErr) {
                    // Transport service may fail if no ride share is configured - that's ok
                    console.log("No ride share config found for session:", transportErr);
                }

                setSession(sessionData);
            } catch (err) {
                console.error("Failed to fetch session:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        loadSessionData();
    }, [params.id]);

    if (loading) {
        return <LoadingCard text="Loading session..." />;
    }

    if (error || !session) {
        return notFound();
    }

    return <SessionSignIn session={session} />;
}
