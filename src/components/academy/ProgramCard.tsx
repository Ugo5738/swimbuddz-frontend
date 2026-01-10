"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Program, ProgramLevel } from "@/lib/academy";
import Image from "next/image";
import Link from "next/link";

interface ProgramCardProps {
    program: Program;
    enrolledProgramIds?: string[];
}

const levelLabels: Record<ProgramLevel, string> = {
    [ProgramLevel.BEGINNER_1]: "Beginner 1",
    [ProgramLevel.BEGINNER_2]: "Beginner 2",
    [ProgramLevel.INTERMEDIATE]: "Intermediate",
    [ProgramLevel.ADVANCED]: "Advanced",
    [ProgramLevel.SPECIALTY]: "Specialty",
};

const levelColors: Record<ProgramLevel, string> = {
    [ProgramLevel.BEGINNER_1]: "bg-green-100 text-green-700",
    [ProgramLevel.BEGINNER_2]: "bg-blue-100 text-blue-700",
    [ProgramLevel.INTERMEDIATE]: "bg-purple-100 text-purple-700",
    [ProgramLevel.ADVANCED]: "bg-orange-100 text-orange-700",
    [ProgramLevel.SPECIALTY]: "bg-pink-100 text-pink-700",
};

export function ProgramCard({ program, enrolledProgramIds = [] }: ProgramCardProps) {
    const isEnrolled = enrolledProgramIds.includes(program.id);
    const price = program.price_amount
        ? `₦${program.price_amount.toLocaleString()}`
        : "Free";

    return (
        <Link href={`/account/academy/programs/${program.id}`}>
            <Card className="group h-full overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
                {/* Cover Image */}
                <div className="relative h-48 bg-gradient-to-br from-cyan-500 to-blue-600">
                    {program.cover_image_url ? (
                        <Image
                            src={program.cover_image_url}
                            alt={program.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl opacity-30">🏊</span>
                        </div>
                    )}
                    {/* Level Badge */}
                    <div className="absolute top-3 left-3">
                        <Badge className={levelColors[program.level]}>
                            {levelLabels[program.level]}
                        </Badge>
                    </div>
                    {/* Enrolled Badge */}
                    {isEnrolled && (
                        <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 text-white">
                                ✓ Enrolled
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2">
                        {program.name}
                    </h3>

                    {program.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                            {program.description}
                        </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="text-cyan-600">📅</span>
                                {program.duration_weeks} weeks
                            </span>
                        </div>
                        <span className="font-bold text-cyan-600">{price}</span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
