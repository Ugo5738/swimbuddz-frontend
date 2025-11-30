"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Search, MapPin, Award } from "lucide-react";
import { apiEndpoints } from "@/lib/config";

interface Member {
    id: string;
    first_name: string;
    last_name: string;
    city: string;
    country: string;
    swim_level: string;
    interest_tags: string[];
    profile_photo_url?: string;
}

const swimLevelLabels: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
};

export default function MemberDirectoryPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState<string>("all");

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            // TODO: Update API endpoint to filter by show_in_directory=true
            const response = await fetch(`${apiEndpoints.members}/`);
            if (response.ok) {
                const data = await response.json();
                // Filter only members who opted in to directory
                const directoryMembers = data.filter((m: any) => m.show_in_directory);
                setMembers(directoryMembers);
            }
        } catch (error) {
            console.error("Failed to fetch members:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            searchQuery === "" ||
            `${member.first_name} ${member.last_name}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            member.city.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesLevel =
            filterLevel === "all" || member.swim_level === filterLevel;

        return matchesSearch && matchesLevel;
    });

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
            {/* Header */}
            <header className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Member Directory</h1>
                <p className="text-sm md:text-base text-slate-600">
                    Connect with fellow swimmers in the SwimBuddz community.
                </p>
            </header>

            {/* Search & Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm md:text-base focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterLevel("all")}
                        className={`rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${filterLevel === "all"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        All Levels
                    </button>
                    <button
                        onClick={() => setFilterLevel("beginner")}
                        className={`rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${filterLevel === "beginner"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        Beginner
                    </button>
                    <button
                        onClick={() => setFilterLevel("intermediate")}
                        className={`rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${filterLevel === "intermediate"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        Intermediate
                    </button>
                    <button
                        onClick={() => setFilterLevel("advanced")}
                        className={`rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${filterLevel === "advanced"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        Advanced
                    </button>
                </div>
            </div>

            {/* Members Grid */}
            {loading ? (
                <LoadingPage text="Loading members..." />
            ) : filteredMembers.length === 0 ? (
                <Card className="p-12 text-center">
                    <Search className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No members found</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Try adjusting your search or filters.
                    </p>
                </Card>
            ) : (
                <>
                    <div className="text-sm text-slate-600">
                        Showing {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
                    </div>

                    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMembers.map((member) => (
                            <Card key={member.id} className="transition-all hover:shadow-lg">
                                <div className="space-y-4">
                                    {/* Profile Photo */}
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500">
                                            {member.profile_photo_url ? (
                                                <img
                                                    src={member.profile_photo_url}
                                                    alt={`${member.first_name} ${member.last_name}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                                                    {member.first_name[0]}
                                                    {member.last_name[0]}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-slate-900">
                                                {member.first_name} {member.last_name}
                                            </h3>
                                            <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span>
                                                    {member.city}, {member.country}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Swim Level */}
                                    <div className="flex items-center gap-2">
                                        <Award className="h-4 w-4 text-slate-400" />
                                        <span className="text-sm text-slate-700">
                                            {swimLevelLabels[member.swim_level] || member.swim_level}
                                        </span>
                                    </div>

                                    {/* Interest Tags */}
                                    {member.interest_tags && member.interest_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {member.interest_tags.slice(0, 3).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                                                >
                                                    {tag.replace("_", " ")}
                                                </span>
                                            ))}
                                            {member.interest_tags.length > 3 && (
                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                                    +{member.interest_tags.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
