"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { supabase } from "@/lib/auth";
import { getCoachProfile, type CoachProfile as CoachProfileType } from "@/lib/coach";
import { Award, Calendar, Edit, MapPin, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CoachProfilePage() {
    const [profile, setProfile] = useState<CoachProfileType | null>(null);
    const [email, setEmail] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProfile() {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user?.email) {
                    setEmail(user.email);
                }

                const profileData = await getCoachProfile();
                setProfile(profileData);
            } catch (err) {
                console.error("Failed to load profile", err);
                setError("Failed to load your profile");
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    if (loading) {
        return <LoadingCard text="Loading your profile..." />;
    }

    if (error) {
        return (
            <Alert variant="error" title="Error">
                {error}
            </Alert>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-600 mt-1">
                        View and manage your coach profile.
                    </p>
                </div>
                <Link href="/coach/edit">
                    <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                    </Button>
                </Link>
            </div>

            {/* Profile Overview */}
            <Card className="p-6">
                <div className="flex items-start gap-4">
                    <div className="p-4 rounded-full bg-emerald-100">
                        <User className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-slate-900">
                            {profile?.display_name || email?.split("@")[0] || "Coach"}
                        </h2>
                        <p className="text-slate-600">{email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant={profile?.status === "active" ? "success" : "warning"}>
                                {profile?.status?.toUpperCase() || "PENDING"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Bio */}
            {profile?.short_bio && (
                <Card className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">About</h3>
                    <p className="text-slate-600">{profile.short_bio}</p>
                </Card>
            )}

            {/* Coach Details */}
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Experience */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-900">Experience</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">
                        {profile?.coaching_years || 0} years
                    </p>
                    <p className="text-sm text-slate-500">Coaching experience</p>
                </Card>

                {/* Certifications */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Award className="h-5 w-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-900">Certifications</h3>
                    </div>
                    {(profile?.certifications || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {profile?.certifications.map((cert) => (
                                <Badge key={cert} variant="default">
                                    {cert}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">No certifications listed</p>
                    )}
                </Card>
            </div>

            {/* Specialties */}
            {(profile?.coaching_specialties || []).length > 0 && (
                <Card className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-3">Coaching Specialties</h3>
                    <div className="flex flex-wrap gap-2">
                        {profile?.coaching_specialties.map((specialty) => (
                            <Badge key={specialty} variant="info">
                                {specialty}
                            </Badge>
                        ))}
                    </div>
                </Card>
            )}

            {/* Locations */}
            {(profile?.pools_supported || []).length > 0 && (
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-5 w-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-900">Coaching Locations</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {profile?.pools_supported.map((pool) => (
                            <Badge key={pool} variant="default">
                                {pool.replace(/_/g, " ")}
                            </Badge>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
