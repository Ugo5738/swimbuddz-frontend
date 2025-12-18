"use client";

import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { BookOpen, Calendar, ChevronRight, Search, Tag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Tip {
    id: string;
    title: string;
    excerpt?: string;
    content: string;
    category: string;
    author_name?: string;
    published_at?: string;
    image_url?: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
    technique: { bg: "bg-blue-100", text: "text-blue-700" },
    fitness: { bg: "bg-emerald-100", text: "text-emerald-700" },
    nutrition: { bg: "bg-orange-100", text: "text-orange-700" },
    safety: { bg: "bg-rose-100", text: "text-rose-700" },
    equipment: { bg: "bg-purple-100", text: "text-purple-700" },
    general: { bg: "bg-slate-100", text: "text-slate-700" },
};

export default function CommunityTipsPage() {
    const [tips, setTips] = useState<Tip[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    useEffect(() => {
        fetchTips();
    }, []);

    const fetchTips = async () => {
        try {
            // Try to fetch tips from API, fallback to placeholder if not available
            const data = await apiGet<Tip[]>("/api/v1/community/tips", { auth: true });
            setTips(data);
        } catch (error) {
            console.error("Failed to fetch tips:", error);
            // Use placeholder data if API fails
            setTips([
                {
                    id: "1",
                    title: "Perfecting Your Freestyle Stroke",
                    excerpt: "Master the fundamentals of freestyle swimming with these essential tips for hand entry, catch, and pull phases.",
                    content: "",
                    category: "technique",
                    author_name: "Coach Sarah",
                    published_at: new Date().toISOString(),
                },
                {
                    id: "2",
                    title: "Essential Pre-Swim Warm-Up Routine",
                    excerpt: "Prevent injuries and improve performance with this 10-minute dynamic warm-up routine before hitting the pool.",
                    content: "",
                    category: "fitness",
                    author_name: "Coach Mike",
                    published_at: new Date().toISOString(),
                },
                {
                    id: "3",
                    title: "What to Eat Before and After Swimming",
                    excerpt: "Fuel your swim sessions right with the best foods for energy and recovery.",
                    content: "",
                    category: "nutrition",
                    author_name: "Nutrition Team",
                    published_at: new Date().toISOString(),
                },
                {
                    id: "4",
                    title: "Pool Safety Rules Every Swimmer Should Know",
                    excerpt: "Stay safe in the water with these essential guidelines for swimming in public pools.",
                    content: "",
                    category: "safety",
                    author_name: "SwimBuddz Team",
                    published_at: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const categories = ["all", ...new Set(tips.map(t => t.category))];

    const filteredTips = tips.filter((tip) => {
        const matchesSearch =
            searchQuery === "" ||
            tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tip.excerpt && tip.excerpt.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
            filterCategory === "all" || tip.category === filterCategory;

        return matchesSearch && matchesCategory;
    });

    const getCategoryStyle = (category: string) => {
        return categoryColors[category.toLowerCase()] || categoryColors.general;
    };

    if (loading) {
        return <LoadingPage text="Loading tips..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tips & Articles</h1>
                <p className="text-sm md:text-base text-slate-600">
                    Expert advice, techniques, and insights to help you become a better swimmer.
                </p>
            </header>

            {/* Search & Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tips..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm md:text-base focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setFilterCategory(category)}
                            className={`rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors capitalize ${filterCategory === category
                                    ? "bg-cyan-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                        >
                            {category === "all" ? "All Categories" : category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tips Grid */}
            {filteredTips.length === 0 ? (
                <Card className="p-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No tips found</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Try adjusting your search or filters.
                    </p>
                </Card>
            ) : (
                <>
                    <div className="text-sm text-slate-600">
                        Showing {filteredTips.length} tip{filteredTips.length !== 1 ? "s" : ""}
                    </div>

                    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredTips.map((tip) => {
                            const style = getCategoryStyle(tip.category);
                            return (
                                <Link href={`/community/tips/${tip.id}`} key={tip.id}>
                                    <Card className="h-full transition-all hover:shadow-lg cursor-pointer group">
                                        <div className="space-y-4">
                                            {/* Category Badge */}
                                            <div className="flex items-center justify-between">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style.bg} ${style.text}`}>
                                                    <Tag className="h-3 w-3" />
                                                    {tip.category}
                                                </span>
                                                {tip.published_at && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(tip.published_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2">
                                                {tip.title}
                                            </h3>

                                            {/* Excerpt */}
                                            {tip.excerpt && (
                                                <p className="text-sm text-slate-600 line-clamp-3">
                                                    {tip.excerpt}
                                                </p>
                                            )}

                                            {/* Author & Read More */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                {tip.author_name && (
                                                    <span className="text-xs text-slate-500">
                                                        By {tip.author_name}
                                                    </span>
                                                )}
                                                <span className="text-sm font-medium text-cyan-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                                                    Read more
                                                    <ChevronRight className="h-4 w-4" />
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
