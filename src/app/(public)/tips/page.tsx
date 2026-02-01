"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiEndpoints } from "@/lib/config";
import { format } from "date-fns";
import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ContentPost {
    id: string;
    title: string;
    summary: string;
    category: string;
    tier_access: string;
    featured_image_url: string | null;
    published_at: string;
    created_at: string;
}

const categoryLabels: Record<string, string> = {
    getting_started: "Getting Started",
    technique: "Technique",
    fitness: "Fitness",
    safety: "Safety",
    nutrition: "Nutrition",
    gear: "Gear & Equipment",
    mindset: "Mindset",
    general: "General",
};

const categoryColors: Record<string, string> = {
    getting_started: "bg-green-100 text-green-700",
    technique: "bg-blue-100 text-blue-700",
    fitness: "bg-purple-100 text-purple-700",
    safety: "bg-red-100 text-red-700",
    nutrition: "bg-orange-100 text-orange-700",
    gear: "bg-slate-100 text-slate-700",
    mindset: "bg-pink-100 text-pink-700",
    general: "bg-cyan-100 text-cyan-700",
};

export default function TipsPage() {
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await fetch(`${apiEndpoints.content}?published_only=true`);
            if (response.ok) {
                const data = await response.json();
                // Only show community-accessible posts to public visitors
                const publicPosts = data.filter(
                    (post: ContentPost) => post.tier_access === "community"
                );
                setPosts(publicPosts);
            }
        } catch (error) {
            console.error("Failed to fetch content:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = selectedCategory
        ? posts.filter((post) => post.category === selectedCategory)
        : posts;

    const categories = [...new Set(posts.map((post) => post.category))];

    return (
        <div className="space-y-10">
            {/* Header */}
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25">
                        <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
                            Learn
                        </p>
                        <h1 className="text-4xl font-bold text-slate-900">
                            Swimming Tips & Guides
                        </h1>
                    </div>
                </div>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Whether you&apos;re just starting out or looking to improve your technique,
                    these guides will help you on your swimming journey.
                </p>
            </header>

            {/* Category Filters */}
            {categories.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${selectedCategory === null
                                ? "bg-cyan-600 text-white shadow-md"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                    >
                        All
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${selectedCategory === category
                                    ? "bg-cyan-600 text-white shadow-md"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                        >
                            {categoryLabels[category] || category}
                        </button>
                    ))}
                </div>
            )}

            {/* Content Grid */}
            {loading ? (
                <LoadingCard text="Loading tips..." />
            ) : filteredPosts.length === 0 ? (
                <Card className="p-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                        No articles available yet
                    </h3>
                    <p className="mt-2 text-slate-600">
                        Check back soon for swimming tips and guides!
                    </p>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPosts.map((post) => (
                        <Link key={post.id} href={`/tips/${post.id}`}>
                            <Card className="group h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                                {/* Featured Image */}
                                {post.featured_image_url ? (
                                    <div className="aspect-video overflow-hidden bg-slate-100">
                                        <img
                                            src={post.featured_image_url}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-video bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
                                        <BookOpen className="h-12 w-12 text-cyan-400" />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[post.category] ||
                                                categoryColors.general
                                                }`}
                                        >
                                            {categoryLabels[post.category] || post.category}
                                        </span>
                                        {post.published_at && (
                                            <span className="text-xs text-slate-500">
                                                {format(new Date(post.published_at), "MMM d, yyyy")}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2">
                                        {post.title}
                                    </h2>

                                    <p className="text-sm text-slate-600 line-clamp-3">
                                        {post.summary}
                                    </p>

                                    <div className="flex items-center gap-1 text-sm font-semibold text-cyan-600 pt-2">
                                        Read article
                                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* CTA Section */}
            <Card className="p-8 bg-gradient-to-br from-cyan-50 to-white border-cyan-100 text-center">
                <h3 className="text-xl font-semibold text-slate-900">
                    Ready to start your swimming journey?
                </h3>
                <p className="mt-2 text-slate-600 max-w-xl mx-auto">
                    Join SwimBuddz to access more exclusive content, connect with coaches,
                    and be part of our swimming community.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/register"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
                    >
                        Join SwimBuddz
                    </Link>
                    <Link
                        href="/about"
                        className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                    >
                        Learn More
                    </Link>
                </div>
            </Card>
        </div>
    );
}
