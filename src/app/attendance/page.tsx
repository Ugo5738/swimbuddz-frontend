"use client";

import { Combobox, type ComboboxOption } from "@/components/forms/Combobox";
import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { format } from "date-fns";
import { useEffect, useState } from "react";

type Member = {
    id: string;
    first_name: string;
    last_name: string;
};

type Session = {
    id: string;
    start_time: string;
    end_time: string;
    title: string;
    location: string;
    pool_fee: number;
};

const rideShareOptions = [
    { value: "none", label: "None" },
    { value: "lead", label: "Ride Share Lead" },
    { value: "join", label: "Join Ride Share" },
];

export default function AttendancePage() {
    type RideConfigArea = {
        id: string;
        name: string;
        slug: string;
        pickup_locations: {
            id: string;
            name: string;
            description: string;
        }[];
        routes: Record<string, {
            destination_name: string;
            distance: string;
            duration: string;
            departure_offset: number;
        }>;
    };

    const [members, setMembers] = useState<Member[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [rideConfig, setRideConfig] = useState<RideConfigArea[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [rideShareOption, setRideShareOption] = useState("none");
    const [pickupLocation, setPickupLocation] = useState("");
    const [rideSummary, setRideSummary] = useState<any>(null);

    // Derived state for route info
    const [routeInfo, setRouteInfo] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [membersData, sessionsData, configData] = await Promise.all([
                    apiGet<Member[]>("/api/v1/members/public"),
                    apiGet<Session[]>("/api/v1/sessions/"),
                    apiGet<{ areas: RideConfigArea[] }>("/api/v1/attendance/config"),
                ]);
                setMembers(membersData);
                setSessions(sessionsData);
                setRideConfig(configData.areas);

                // Auto-select the first upcoming session if available, prioritizing "Midday"
                if (sessionsData.length > 0) {
                    const middaySession = sessionsData.find(s => s.title.toLowerCase().includes("midday"));
                    if (middaySession) {
                        setSelectedSessionId(middaySession.id);
                    } else {
                        setSelectedSessionId(sessionsData[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
                setError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Fetch ride summary when session changes
    useEffect(() => {
        async function fetchRideSummary() {
            if (!selectedSessionId) {
                setRideSummary(null);
                return;
            }

            try {
                const summary = await apiGet(`/api/v1/attendance/sessions/${selectedSessionId}/ride-summary`);
                setRideSummary(summary);
            } catch (err) {
                console.error("Failed to fetch ride summary", err);
            }
        }
        fetchRideSummary();
    }, [selectedSessionId]);

    // Update route info when pickup location changes
    useEffect(() => {
        if (!pickupLocation || rideConfig.length === 0) {
            setRouteInfo(null);
            return;
        }

        // Find the area that contains this location
        for (const area of rideConfig) {
            const loc = area.pickup_locations.find(l => l.name === pickupLocation);
            if (loc) {
                // Found the location. 
                // Check if the location has specific route info for "main_pool"
                // If not, fall back to area default.

                // Note: We need to update the type definition to include routes on pickup_locations
                const locRoutes = (loc as any).routes;
                const areaRoutes = area.routes;

                const destinationKey = "main_pool"; // Default for now

                let route = null;
                if (locRoutes && locRoutes[destinationKey]) {
                    route = locRoutes[destinationKey];
                } else if (areaRoutes && areaRoutes[destinationKey]) {
                    route = areaRoutes[destinationKey];
                }

                if (route) {
                    setRouteInfo(route);
                }
                break;
            }
        }
    }, [pickupLocation, rideConfig]);

    const memberOptions: ComboboxOption[] = members.map((m) => ({
        value: m.id,
        label: `${m.first_name} ${m.last_name}`,
    }));

    const sessionOptions = sessions.map((s) => {
        const start = new Date(s.start_time);
        const end = new Date(s.end_time);
        return {
            value: s.id,
            label: `${format(start, "MMM d, yyyy")} - ${s.title} (${format(start, "h:mm a")} - ${format(end, "h:mm a")})`,
        };
    });

    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    const poolFee = selectedSession?.pool_fee || 0;
    const rideShareFee = 4000; // Hardcoded as per requirements
    const totalFee = rideShareOption === "join" ? (rideShareFee + poolFee) : poolFee;

    // Calculate departure time based on route info offset
    const departureTime = selectedSession && routeInfo
        ? new Date(new Date(selectedSession.start_time).getTime() - routeInfo.departure_offset * 60 * 1000)
        : null;

    let rideStatusMessage = "";
    let activeLocation = null;
    let filledSeats = 0;

    if (rideSummary && rideSummary.rides.length > 0) {
        const latestRide = rideSummary.rides[rideSummary.rides.length - 1];
        filledSeats = latestRide.filled_seats;

        if (rideSummary.active_location) {
            activeLocation = rideSummary.active_location;
            rideStatusMessage = `Ride #${latestRide.ride_number} filling: ${filledSeats}/4 passengers at ${activeLocation}.`;
        } else {
            rideStatusMessage = `Ride #${latestRide.ride_number}: ${filledSeats}/4 passengers. Select a location to start filling.`;
        }
    } else if (selectedSessionId) {
        rideStatusMessage = "Ride #1: 0/4 passengers. Select a location to start filling.";
    }

    async function handleSubmit() {
        if (!selectedMemberId || !selectedSessionId) {
            setError("Please select a member and a session.");
            return;
        }

        if (rideShareOption === "join" && !pickupLocation) {
            setError("Please select a pickup location.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await apiPost(`/api/v1/attendance/sessions/${selectedSessionId}/attendance/public`, {
                member_id: selectedMemberId,
                ride_share_option: rideShareOption,
                needs_ride: rideShareOption === "join",
                can_offer_ride: rideShareOption === "lead",
                ride_notes: "", // Optional
                pickup_location: rideShareOption === "join" ? pickupLocation : null,
                payment_status: "pending", // Default
            });
            setSuccess(true);
            // Refresh summary after submission
            const summary = await apiGet(`/api/v1/attendance/sessions/${selectedSessionId}/ride-summary`);
            setRideSummary(summary);
        } catch (err: any) {
            console.error("Submission failed", err);
            setError(err.message || "Failed to mark attendance.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
    }

    if (success) {
        return (
            <div className="mx-auto max-w-md p-8">
                <Alert variant="info" title="Success!">
                    You have successfully checked in.
                </Alert>
                <div className="mt-6 text-center">
                    <Button onClick={() => {
                        setSuccess(false);
                        setSelectedMemberId("");
                        setRideShareOption("none");
                        setPickupLocation("");
                        // Keep summary to show updated stats
                    }}>
                        Check in another member
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md space-y-8 p-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900">Attendance Sign-in</h1>
                <p className="text-slate-600">Please mark your attendance for the session.</p>
            </div>

            {error && (
                <Alert variant="error" title="Error">
                    {error}
                </Alert>
            )}

            <div className="space-y-6">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Session</label>
                    <select
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                    >
                        {sessionOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <Combobox
                    label="Member Name"
                    value={selectedMemberId}
                    options={memberOptions}
                    onChange={setSelectedMemberId}
                    placeholder="Search your name..."
                    required
                />

                <OptionPillGroup
                    label="Ride Share Option"
                    options={rideShareOptions}
                    selected={[rideShareOption]}
                    onToggle={(val) => setRideShareOption(val)}
                />

                {rideStatusMessage && (
                    <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 border border-blue-100 flex items-center">
                        <span className="mr-2">🚗</span>
                        <span className="font-medium">{rideStatusMessage}</span>
                    </div>
                )}

                {rideShareOption === "join" && (
                    <div className="space-y-4 rounded-md bg-slate-50 p-4 border border-slate-200">
                        {routeInfo && (
                            <div className="mb-4 p-3 bg-white rounded border border-slate-100 shadow-sm">
                                <h3 className="font-semibold text-slate-900 text-sm">Trip Details</h3>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <p className="text-xs text-slate-500">Destination</p>
                                        <p className="text-sm font-medium text-slate-800">{routeInfo.destination_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Distance</p>
                                        <p className="text-sm font-medium text-slate-800">{routeInfo.distance} ({routeInfo.duration})</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-slate-500">Departure Time</p>
                                        <p className="text-sm font-medium text-slate-800">
                                            {departureTime ? format(departureTime, "h:mm a") : "..."}
                                            <span className="text-xs font-normal text-slate-500 ml-1">
                                                ({routeInfo.departure_offset / 60} hours before session)
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">Select Pickup Location</label>

                            {rideConfig.map((area) => (
                                <div key={area.id} className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{area.name} Area</h4>
                                    <div className="space-y-2">
                                        {area.pickup_locations.map((loc) => {
                                            const isDisabled = activeLocation && activeLocation !== loc.name;

                                            // Resolve route for this location
                                            const locRoutes = (loc as any).routes;
                                            const areaRoutes = area.routes;
                                            const destinationKey = "main_pool";

                                            let route = null;
                                            if (locRoutes && locRoutes[destinationKey]) {
                                                route = locRoutes[destinationKey];
                                            } else if (areaRoutes && areaRoutes[destinationKey]) {
                                                route = areaRoutes[destinationKey];
                                            }

                                            // Calculate departure time if route and session exist
                                            let depTimeStr = "";
                                            if (route && selectedSession) {
                                                const depTime = new Date(new Date(selectedSession.start_time).getTime() - route.departure_offset * 60 * 1000);
                                                depTimeStr = format(depTime, "h:mm a");
                                            }

                                            return (
                                                <label
                                                    key={loc.id}
                                                    className={`flex items-start justify-between p-3 rounded-md border ${isDisabled ? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed" :
                                                        pickupLocation === loc.name ? "bg-cyan-50 border-cyan-500 ring-1 ring-cyan-500" : "bg-white border-slate-200 hover:border-cyan-300 cursor-pointer"
                                                        }`}
                                                >
                                                    <div className="flex items-start space-x-3">
                                                        <input
                                                            type="radio"
                                                            name="pickupLocation"
                                                            value={loc.name}
                                                            checked={pickupLocation === loc.name}
                                                            onChange={(e) => setPickupLocation(e.target.value)}
                                                            disabled={!!isDisabled}
                                                            className="mt-1 h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                        />
                                                        <div>
                                                            <span className={`block text-sm font-medium ${isDisabled ? "text-slate-500" : "text-slate-900"}`}>
                                                                {loc.name}
                                                            </span>
                                                            {loc.description && (
                                                                <span className="block text-xs text-slate-500 mb-1">
                                                                    {loc.description}
                                                                </span>
                                                            )}
                                                            {route && (
                                                                <div className="flex items-center space-x-3 text-xs text-slate-600 mt-1">
                                                                    <span className="flex items-center" title="Distance">
                                                                        📍 {route.distance}
                                                                    </span>
                                                                    <span className="flex items-center" title="Duration">
                                                                        ⏱️ {route.duration}
                                                                    </span>
                                                                    {depTimeStr && (
                                                                        <span className="flex items-center font-medium text-slate-800" title="Departure Time">
                                                                            🚀 Departs {depTimeStr}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {activeLocation === loc.name && (
                                                        <span className="text-xs font-bold text-cyan-600 bg-cyan-100 px-2 py-1 rounded-full">
                                                            Filling
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-lg bg-slate-50 p-4">
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                        <span>Payment Due:</span>
                        <span className="text-lg font-bold text-slate-900">
                            ₦{totalFee.toLocaleString()}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        {rideShareOption === "join"
                            ? "Includes pool fee (2k) + ride share fee (4k)"
                            : "Pool fee only"}
                    </p>
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                    {submitting ? "Submitting..." : "Mark Attendance"}
                </Button>
            </div>
        </div>
    );
}
