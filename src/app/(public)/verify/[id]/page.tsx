"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const QRCode = dynamic(
    () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
    {
        ssr: false,
        loading: () => <div className="w-24 h-24 bg-slate-200 animate-pulse rounded" />
    }
);

type MemberVerification = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_photo_url?: string;
    created_at: string;
    membership?: {
        active_tiers?: string[];
        community_paid_until?: string | null;
        club_paid_until?: string | null;
        academy_paid_until?: string | null;
    } | null;
};

export default function VerifyMemberPage() {
    const params = useParams();
    const memberId = params.id as string;

    const [member, setMember] = useState<MemberVerification | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!memberId) {
            setError("No member ID provided");
            setLoading(false);
            return;
        }

        const fetchMember = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
                const res = await fetch(`${API_BASE}/api/v1/members/public/${memberId}`);

                if (!res.ok) {
                    if (res.status === 404) {
                        setError("Member not found");
                    } else {
                        setError("Unable to verify member");
                    }
                    return;
                }

                const data = await res.json();
                setMember(data);
            } catch (e) {
                setError("Unable to connect to verification service");
            } finally {
                setLoading(false);
            }
        };

        fetchMember();
    }, [memberId]);

    const now = Date.now();

    const getActiveStatus = () => {
        if (!member?.membership) return { active: false, tier: null, validUntil: null };

        const { community_paid_until, club_paid_until, academy_paid_until } = member.membership;

        // Check tiers in order of priority
        if (academy_paid_until && new Date(academy_paid_until).getTime() > now) {
            return { active: true, tier: "academy", validUntil: academy_paid_until };
        }
        if (club_paid_until && new Date(club_paid_until).getTime() > now) {
            return { active: true, tier: "club", validUntil: club_paid_until };
        }
        if (community_paid_until && new Date(community_paid_until).getTime() > now) {
            return { active: true, tier: "community", validUntil: community_paid_until };
        }

        return { active: false, tier: null, validUntil: null };
    };

    const status = member ? getActiveStatus() : null;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <LoadingCard text="Verifying member..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Verification Failed</h1>
                    <p className="text-slate-600">{error}</p>
                    <p className="text-sm text-slate-500">
                        If this is unexpected, please contact SwimBuddz support.
                    </p>
                </Card>
            </div>
        );
    }

    if (!member) return null;

    const fullName = `${member.first_name} ${member.last_name}`;
    const memberSince = new Date(member.created_at).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
    });
    const validUntil = status?.validUntil
        ? new Date(status.validUntil).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        })
        : null;

    const tierColors: Record<string, string> = {
        academy: "bg-purple-100 text-purple-800 border-purple-200",
        club: "bg-teal-100 text-teal-800 border-teal-200",
        community: "bg-blue-100 text-blue-800 border-blue-200"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full overflow-hidden">
                {/* Header with status */}
                <div className={`p-6 text-center ${status?.active ? "bg-emerald-500" : "bg-amber-500"}`}>
                    <div className="mx-auto w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-3">
                        {status?.active ? (
                            <CheckCircle className="w-8 h-8 text-white" />
                        ) : (
                            <AlertCircle className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-white">
                        {status?.active ? "Valid Member" : "Inactive Membership"}
                    </h1>
                    <p className="text-white/90 text-sm mt-1">
                        {status?.active
                            ? "This member has an active SwimBuddz membership"
                            : "This membership is not currently active"}
                    </p>
                </div>

                {/* Member details */}
                <div className="p-6 space-y-6">
                    {/* Profile */}
                    <div className="flex items-center gap-4">
                        {member.profile_photo_url ? (
                            <img
                                src={member.profile_photo_url}
                                alt={fullName}
                                className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-200"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center text-xl font-bold text-cyan-700">
                                {member.first_name[0]}{member.last_name[0]}
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
                            <p className="text-sm text-slate-500">Member since {memberSince}</p>
                        </div>
                    </div>

                    {/* Membership details */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Membership Tier</span>
                            {status?.tier ? (
                                <Badge className={tierColors[status.tier] || ""}>
                                    {status.tier.charAt(0).toUpperCase() + status.tier.slice(1)}
                                </Badge>
                            ) : (
                                <Badge variant="secondary">None</Badge>
                            )}
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Status</span>
                            <span className={`text-sm font-medium ${status?.active ? "text-emerald-600" : "text-amber-600"}`}>
                                {status?.active ? "✓ Active" : "⚠ Inactive"}
                            </span>
                        </div>

                        {validUntil && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Valid Until</span>
                                <span className="text-sm font-medium text-slate-900">{validUntil}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Member ID</span>
                            <span className="text-xs font-mono text-slate-500">
                                {member.id.slice(0, 8).toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* QR Code for re-scan */}
                    <div className="text-center pt-2">
                        <div className="inline-block bg-white p-3 rounded-lg shadow-sm border">
                            <QRCode
                                value={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://swimbuddz.com'}/verify/${member.id}`}
                                size={96}
                                level="H"
                                includeMargin={false}
                                bgColor="#ffffff"
                                fgColor="#1e293b"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Scan to verify again</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-100 px-6 py-3 text-center">
                    <p className="text-xs text-slate-500">
                        SwimBuddz Member Verification • {new Date().toLocaleDateString("en-GB")}
                    </p>
                </div>
            </Card>
        </div>
    );
}
