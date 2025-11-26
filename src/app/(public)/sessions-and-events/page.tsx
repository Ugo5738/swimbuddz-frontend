"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type TabType = "sessions" | "events";

export default function SessionsAndEventsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("sessions");

    return (
        <div className="space-y-8">
            {/* Header */}
            <section className="space-y-4">
                <h1 className="text-4xl font-bold text-slate-900">Sessions & Events</h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Join upcoming Club training sessions or RSVP to community events. Stay connected and show up consistently.
                </p>
            </section>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("sessions")}
                        className={`border-b-2 pb-4 px-1 text-sm font-semibold transition ${activeTab === "sessions"
                                ? "border-cyan-600 text-cyan-700"
                                : "border-transparent text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Club Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab("events")}
                        className={`border-b-2 pb-4 px-1 text-sm font-semibold transition ${activeTab === "events"
                                ? "border-cyan-600 text-cyan-700"
                                : "border-transparent text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Community Events
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "sessions" ? <ClubSessionsTab /> : <CommunityEventsTab />}
        </div>
    );
}

function ClubSessionsTab() {
    return (
        <div className="space-y-6">
            <div className="rounded-lg bg-cyan-50 p-4 border border-cyan-100">
                <p className="text-sm text-cyan-900">
                    <span className="font-semibold">Club members:</span> Browse and sign in to upcoming training sessions below.
                    Not a Club member yet?{" "}
                    <Link href="/club" className="underline font-semibold hover:text-cyan-700">
                        Learn about Club tier
                    </Link>
                </p>
            </div>

            {/* Placeholder for sessions - will integrate with sessions_service API */}
            <Card className="p-8 text-center">
                <p className="text-slate-600 mb-4">
                    Club sessions are managed through the member dashboard once you're signed in.
                </p>
                <Link
                    href="/sessions"
                    className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
                >
                    View All Sessions
                </Link>
            </Card>

            {/* Info Section */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="space-y-2">
                    <h3 className="font-semibold text-slate-900">📍 Locations</h3>
                    <p className="text-sm text-slate-600">
                        Yaba (Rowe Park), Sunfit (Ago), and Victoria Island
                    </p>
                </Card>
                <Card className="space-y-2">
                    <h3 className="font-semibold text-slate-900">⏰ Schedule</h3>
                    <p className="text-sm text-slate-600">
                        Multiple sessions weekly at various times
                    </p>
                </Card>
                <Card className="space-y-2">
                    <h3 className="font-semibold text-slate-900">🚗 Ride-Share</h3>
                    <p className="text-sm text-slate-600">
                        Coordination available for selected sessions
                    </p>
                </Card>
            </div>
        </div>
    );
}

function CommunityEventsTab() {
    return (
        <div className="space-y-6">
            <div className="rounded-lg bg-cyan-50 p-4 border border-cyan-100">
                <p className="text-sm text-cyan-900">
                    <span className="font-semibold">Community events</span> are open to all SwimBuddz members.
                    Beach days, hangouts, watch parties, and more!
                </p>
            </div>

            {/* Placeholder for events - will integrate with events_service API */}
            <Card className="p-8 text-center">
                <p className="text-slate-600 mb-4">
                    Community events calendar is accessible through the member dashboard.
                </p>
                <Link
                    href="/community/events"
                    className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
                >
                    View Events Calendar
                </Link>
            </Card>

            {/* Event Types */}
            <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Types of Events</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="space-y-2">
                        <h4 className="font-semibold text-cyan-700">🏖️ Beach Days</h4>
                        <p className="text-sm text-slate-600">
                            Relaxed ocean swims and beach hangouts
                        </p>
                    </Card>
                    <Card className="space-y-2">
                        <h4 className="font-semibold text-cyan-700">🎉 Social Hangouts</h4>
                        <p className="text-sm text-slate-600">
                            Meet fellow swimmers outside the pool
                        </p>
                    </Card>
                    <Card className="space-y-2">
                        <h4 className="font-semibold text-cyan-700">📺 Watch Parties</h4>
                        <p className="text-sm text-slate-600">
                            Watch swimming competitions together
                        </p>
                    </Card>
                    <Card className="space-y-2">
                        <h4 className="font-semibold text-cyan-700">🤝 Volunteer Events</h4>
                        <p className="text-sm text-slate-600">
                            Pool cleanups and community service
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
