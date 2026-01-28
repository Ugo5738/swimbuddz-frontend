"use client";

/* eslint-disable @next/next/no-img-element */

import { Card } from "@/components/ui/Card";
import { Maximize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const QRCode = dynamic(
    () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
    {
        ssr: false,
        loading: () => (
            <div className="animate-pulse bg-slate-200 rounded" style={{ width: 100, height: 100 }} />
        )
    }
);

interface MembershipCardProps {
    name: string;
    tier: "club" | "academy" | "community";
    memberId: string;
    joinedAt: string;
    photoUrl?: string;
    validUntil?: string;
}

export function MembershipCard({ name, tier, memberId, joinedAt, photoUrl, validUntil }: MembershipCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Tier-based styling
    const tierConfig = {
        academy: {
            gradient: "from-violet-600 via-purple-600 to-indigo-700",
            accent: "bg-violet-500/20",
            badge: "bg-gradient-to-r from-violet-400 to-purple-500 text-white",
            glow: "shadow-purple-500/30",
            label: "Academy Member"
        },
        club: {
            gradient: "from-emerald-500 via-teal-500 to-cyan-600",
            accent: "bg-emerald-500/20",
            badge: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white",
            glow: "shadow-teal-500/30",
            label: "Club Member"
        },
        community: {
            gradient: "from-blue-500 via-cyan-500 to-teal-500",
            accent: "bg-blue-500/20",
            badge: "bg-gradient-to-r from-blue-400 to-cyan-500 text-white",
            glow: "shadow-blue-500/30",
            label: "Community Member"
        }
    };

    const config = tierConfig[tier] || tierConfig.community;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "https://swimbuddz.com");
    const qrValue = `${baseUrl}/verify/${memberId}`;
    const shortId = memberId.slice(0, 8).toUpperCase();

    // Format Dates
    const memberSince = new Date(joinedAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
    });

    const validUntilFormatted = validUntil
        ? new Date(validUntil).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        : null;

    useEffect(() => {
        setMounted(true);
    }, []);

    const renderCard = (showExpand: boolean, qrSize = 80) => (
        <Card className={`relative overflow-hidden border-none text-white shadow-2xl ring-1 ring-white/10 ${config.glow} bg-gradient-to-br ${config.gradient}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="h-full w-full" viewBox="0 0 200 200" preserveAspectRatio="none">
                    <defs>
                        <pattern id="waves" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M0 20 Q10 10 20 20 T40 20" stroke="white" strokeWidth="0.5" fill="none" />
                        </pattern>
                    </defs>
                    <rect width="200" height="200" fill="url(#waves)" />
                </svg>
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

            {showExpand && (
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 text-white shadow-lg backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Expand membership card"
                >
                    <Maximize2 className="h-4 w-4" />
                </button>
            )}

            <div className="relative p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    {/* Left: Photo and Info */}
                    <div className="flex items-center gap-5">
                        {/* Profile Photo */}
                        <div className="relative flex-shrink-0">
                            <div className={`h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-2xl border-2 border-white/30 shadow-xl ${config.accent} backdrop-blur-sm`}>
                                {photoUrl ? (
                                    <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
                                        {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                    </div>
                                )}
                            </div>
                            {/* Status indicator */}
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 border-2 border-white shadow-lg" title="Active" />
                        </div>

                        {/* Member Info */}
                        <div className="space-y-2">
                            <h3 className="text-xl md:text-2xl font-bold tracking-tight leading-tight drop-shadow">
                                {name}
                            </h3>
                            <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg ${config.badge}`}>
                                {config.label}
                            </div>
                            <div className="flex flex-col gap-0.5 text-xs font-medium opacity-90">
                                <span className="font-mono">ID: {shortId}</span>
                                <span>Member since {memberSince}</span>
                                {validUntilFormatted && (
                                    <span className="text-emerald-200">Valid until {validUntilFormatted}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: QR Code */}
                    {memberId && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="rounded-xl bg-white p-2.5 shadow-2xl ring-2 ring-white/20">
                                <QRCode
                                    value={qrValue}
                                    size={qrSize}
                                    level="H"
                                    includeMargin={false}
                                    bgColor="#ffffff"
                                    fgColor="#1e293b"
                                />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest opacity-80 font-semibold">
                                Scan to verify
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="relative bg-black/20 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏊</span>
                    <span className="text-[11px] text-white/80 font-semibold uppercase tracking-widest">
                        SwimBuddz
                    </span>
                </div>
                <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">
                    Official Membership Pass
                </span>
            </div>
        </Card>
    );

    return (
        <>
            {renderCard(true, 80)}
            {mounted && isExpanded
                ? createPortal(
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
                        onClick={(e) => e.target === e.currentTarget && setIsExpanded(false)}
                    >
                        <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="absolute -right-2 -top-12 rounded-full bg-white p-2 text-slate-800 shadow-lg transition hover:bg-slate-100"
                                aria-label="Close expanded membership card"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            {renderCard(false, 140)}
                        </div>
                    </div>,
                    document.body
                )
                : null}
        </>
    );
}
