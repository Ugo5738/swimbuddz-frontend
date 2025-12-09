"use client";

import { Card } from "@/components/ui/Card";
import { QRCodeSVG } from "qrcode.react";

interface MembershipCardProps {
    name: string;
    tier: "club" | "academy";
    memberId: string;
    joinedAt: string;
    photoUrl?: string;
}

export function MembershipCard({ name, tier, memberId, joinedAt, photoUrl }: MembershipCardProps) {
    const isAcademy = tier === "academy";
    const bgColor = isAcademy
        ? "bg-gradient-to-br from-purple-600 to-indigo-800"
        : "bg-gradient-to-br from-emerald-500 to-teal-700";

    const accentColor = isAcademy ? "text-purple-100" : "text-emerald-100";
    const badgeColor = isAcademy ? "bg-purple-500 text-white" : "bg-emerald-400 text-teal-900";

    // Format Date
    const memberSince = new Date(joinedAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric"
    });

    return (
        <Card className={`relative overflow-hidden border-none text-white shadow-xl ${bgColor}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                </svg>
            </div>

            <div className="relative p-6 flex flex-col md:flex-row items-center gap-6">
                {/* Photo & Identity */}
                <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
                    <div className="relative">
                        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white/20 shadow-lg bg-white/10 backdrop-blur-sm">
                            {photoUrl ? (
                                <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-4xl">
                                    🏊‍♂️
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-wide">{name}</h3>
                        <div className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
                            {tier} Member
                        </div>
                        <div className={`mt-2 text-xs font-mono opacity-80 ${accentColor} space-y-0.5`}>
                            <p>ID: {memberId.slice(0, 8).toUpperCase()}</p>
                            <p>Member Since: {memberSince}</p>
                        </div>
                    </div>
                </div>

                {/* QR Code */}
                <div className="ml-auto flex flex-col items-center gap-2">
                    <div className="rounded-xl bg-white p-3 shadow-lg">
                        <QRCodeSVG
                            value={`swimbuddz:member:${memberId}`}
                            size={80}
                            level="M"
                            includeMargin={false}
                        />
                    </div>
                    <span className="text-[10px] uppercase tracking-wide opacity-75 font-medium">Scan to Verify</span>
                </div>
            </div>

            <div className="relative bg-black/20 px-6 py-2 text-center text-[10px] text-white/60 font-medium uppercase tracking-widest">
                SwimBuddz Official Membership Card
            </div>
        </Card>
    );
}
