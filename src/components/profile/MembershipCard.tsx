"use client";

/* eslint-disable @next/next/no-img-element */

import { Card } from "@/components/ui/Card";
import { Maximize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const QRCode = dynamic(
    () => import("qrcode.react").then((mod) => mod.QRCodeSVG),
    { ssr: false }
);

interface MembershipCardProps {
    name: string;
    tier: "club" | "academy";
    memberId: string;
    joinedAt: string;
    photoUrl?: string;
}

export function MembershipCard({ name, tier, memberId, joinedAt, photoUrl }: MembershipCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const isAcademy = tier === "academy";
    const bgColor = isAcademy
        ? "bg-gradient-to-br from-purple-600 to-indigo-800"
        : "bg-gradient-to-br from-emerald-500 to-teal-700";

    const accentColor = isAcademy ? "text-purple-100" : "text-emerald-100";
    const badgeColor = isAcademy ? "bg-purple-500 text-white" : "bg-emerald-400 text-teal-900";
    const qrValue = `swimbuddz:member:${memberId}`;

    // Format Date
    const memberSince = new Date(joinedAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const renderCard = (showExpand: boolean, qrSize = 88) => (
        <Card className={`relative overflow-hidden border-none text-white shadow-2xl ring-1 ring-white/15 ${bgColor}`}>
            <div className="absolute inset-0 opacity-10">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
            </div>

            {showExpand ? (
                <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white shadow-lg backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Expand membership card"
                >
                    <Maximize2 className="h-4 w-4" />
                </button>
            ) : null}

            <div className="relative p-6 md:p-8 flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex flex-1 flex-col items-center gap-4 text-center md:flex-row md:items-center md:text-left">
                    <div className="relative">
                        <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full border-4 border-white/20 shadow-xl bg-white/10 backdrop-blur-sm">
                            {photoUrl ? (
                                <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-4xl">
                                    🏊‍♂️
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-wide leading-tight">{name}</h3>
                        <div className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${badgeColor}`}>
                            {tier} member
                        </div>
                        <div className={`mt-1 text-xs font-mono opacity-80 ${accentColor} space-y-0.5`}>
                            <p>ID: {memberId.slice(0, 8).toUpperCase()}</p>
                            <p>Member Since: {memberSince}</p>
                        </div>
                    </div>
                </div>

                {memberId ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="rounded-2xl bg-white p-3 shadow-xl">
                            <QRCode value={qrValue} size={qrSize} level="M" includeMargin={false} />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.25em] opacity-80 font-semibold">
                            Scan to verify
                        </span>
                    </div>
                ) : (
                    <div className="text-xs text-white/80">Member ID unavailable</div>
                )}
            </div>

            <div className="relative bg-black/15 px-6 py-3 text-center text-[11px] text-white/70 font-semibold uppercase tracking-[0.3em]">
                SwimBuddz • Official Membership Pass
            </div>
        </Card>
    );

    return (
        <>
            {renderCard(true)}
            {mounted && isExpanded
                ? createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
                        <div className="relative w-full max-w-4xl">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="absolute -right-1 -top-12 rounded-full bg-white/90 p-2 text-slate-800 shadow-md transition hover:bg-white"
                                aria-label="Close expanded membership card"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            {renderCard(false, 144)}
                        </div>
                    </div>,
                    document.body
                )
                : null}
        </>
    );
}
