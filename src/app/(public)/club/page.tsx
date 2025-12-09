import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Benefit = {
    title: string;
    description?: string;
    subItems?: string[];
};

const benefits: Benefit[] = [
    {
        title: "Everything in Community",
        description: ""
    },
    {
        title: "Access to Regular Club Swimming Sessions",
        description: "Weekly or bi-weekly coached sessions. Ongoing swimming exercise at your pace."
    },
    {
        title: "Session Booking & Attendance Tracking",
        description: "RSVP to sessions, see your history, and stay consistent."
    },
    {
        title: "Ride-Share Coordination",
        description: "Organize Ride-Share transportation with other members per session."
    },
    {
        title: "Progress Tracking (Club Level)",
        subItems: [
            "Basic skill improvements",
            "Time tracking (e.g., 50m/100m times)",
            "Feedback from lane captains or coaches"
        ]
    },
    {
        title: "Exclusive Club Events",
        description: "Technique workshops, fun races, themed sessions, fitness days, etc."
    },
    {
        title: "Eligibility for Internal Challenges & Awards",
        subItems: [
            "Time trials",
            "Monthly/seasonal challenges",
            "Progress & performance badges"
        ]
    },
    {
        title: "Recognition System",
        description: "Earn and display titles like Best Freestyle, Most Improved, Distance King/Queen, etc., visible on your public profile."
    },
    {
        title: "Participation in External Activities",
        description: "Access to triathlons, open water swims, swimming festivals, team relays, and partner events."
    }
];

const trainingStructure = [
    {
        title: "Technique Blocks",
        description: "Focus sessions on specific strokes, breathing patterns, and form improvements."
    },
    {
        title: "Performance Squads",
        description: "Group training for swimmers looking to build endurance and speed."
    },
    {
        title: "Consistency Tracking",
        description: "Your attendance and punctuality are tracked to help you stay accountable."
    }
];

const challenges = [
    {
        badge: "Consistent 8",
        criteria: "Attend 8 sessions in a month"
    },
    {
        badge: "Early Bird",
        criteria: "Arrive 15+ minutes early to 5 sessions"
    },
    {
        badge: "Distance Swimmer",
        criteria: "Complete 2km in a single session"
    },
    {
        badge: "Technique Master",
        criteria: "Demonstrate proficiency in all four strokes"
    }
];

export default function ClubPage() {
    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
                    Club Tier
                </p>
                <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
                    Access to Regular Club Swimming Sessions
                </h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    For swimmers who want structured, ongoing improvement and belong to an active swimming group.
                    Ongoing swimming at your pace.
                </p>
            </section>

            {/* Benefits Section */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold text-slate-900">What You Get</h2>
                <Card className="space-y-6 p-6">
                    <ul className="space-y-6">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-4">
                                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm text-cyan-700">
                                    ✓
                                </span>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-slate-900 text-lg leading-tight">
                                        {benefit.title}
                                    </h3>
                                    {benefit.description && (
                                        <p className="text-slate-600 leading-relaxed">
                                            {benefit.description}
                                        </p>
                                    )}
                                    {benefit.subItems && (
                                        <ul className="list-disc pl-4 space-y-1 mt-2">
                                            {benefit.subItems.map((subItem, idx) => (
                                                <li key={idx} className="text-slate-600">
                                                    {subItem}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>

            {/* Training Structure */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">How Training Works</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Every session has a purpose, and the community keeps you going.
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {trainingStructure.map((item) => (
                        <Card key={item.title} className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                            <p className="text-sm text-slate-600">{item.description}</p>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Challenges & Badges */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Challenges & Badges</h2>
                    <p className="text-base text-slate-600 mt-2">
                        Push yourself and earn recognition for your commitment and achievements.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {challenges.map((challenge) => (
                        <Card key={challenge.badge} className="flex items-start gap-4 p-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100">
                                <span className="text-2xl">🏅</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{challenge.badge}</h3>
                                <p className="text-sm text-slate-600">{challenge.criteria}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Session Schedule Preview */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Upcoming Sessions</h2>
                <Card className="p-6 text-center">
                    <p className="text-slate-600 mb-4">
                        View the full schedule and sign up for upcoming training sessions.
                    </p>
                    <Link
                        href="/sessions-and-events"
                        className="inline-block rounded-full bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
                    >
                        View Sessions Schedule
                    </Link>
                </Card>
            </section>

            {/* CTA Section */}
            <section className="rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-700 px-8 py-12 text-center text-white">
                <h2 className="text-3xl font-bold mb-4">Who is this for?</h2>
                <p className="text-lg mb-6 text-cyan-50 max-w-2xl mx-auto">
                    Anyone who wants to swim regularly, get better, be part of a training culture, and track progress month-by-month.
                </p>
                <Link
                    href="/register"
                    className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-cyan-700 hover:bg-slate-50 transition"
                >
                    Join Club Tier
                </Link>
            </section>
        </div>
    );
}
