"use client";

import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiEndpoints } from "@/lib/config";
import { BookOpen, Calendar, ChevronRight, MessageCircle, Search, Tag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ContentPost {
    id: string;
    title: string;
    summary?: string;
    body: string;
    category: string;
    featured_image_url?: string;
    published_at?: string;
    tier_access: string;
    created_by: string;
    comment_count?: number;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
    technique: { bg: "bg-blue-100", text: "text-blue-700" },
    swimming_tips: { bg: "bg-blue-100", text: "text-blue-700" },
    fitness: { bg: "bg-emerald-100", text: "text-emerald-700" },
    breathing: { bg: "bg-cyan-100", text: "text-cyan-700" },
    nutrition: { bg: "bg-orange-100", text: "text-orange-700" },
    safety: { bg: "bg-rose-100", text: "text-rose-700" },
    equipment: { bg: "bg-purple-100", text: "text-purple-700" },
    news: { bg: "bg-amber-100", text: "text-amber-700" },
    education: { bg: "bg-indigo-100", text: "text-indigo-700" },
    general: { bg: "bg-slate-100", text: "text-slate-700" },
};

export default function CommunityTipsPage() {
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            // Fetch published content posts from API
            const response = await fetch(`${apiEndpoints.content}?published_only=true`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            } else {
                console.error("Failed to fetch content posts:", response.status);
                setPosts([]);
            }
        } catch (error) {
            console.error("Failed to fetch content posts:", error);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const categories = ["all", ...new Set(posts.map(p => p.category))];

    const filteredPosts = posts.filter((post) => {
        const matchesSearch =
            searchQuery === "" ||
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (post.summary && post.summary.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
            filterCategory === "all" || post.category === filterCategory;

        return matchesSearch && matchesCategory;
    });

    const getCategoryStyle = (category: string) => {
        return categoryColors[category.toLowerCase()] || categoryColors.general;
    };

    const formatCategoryName = (category: string) => {
        return category.replace(/_/g, " ");
    };

    if (loading) {
        return <LoadingPage text="Loading articles..." />;
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
                            placeholder="Search articles..."
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
                            {category === "all" ? "All Categories" : formatCategoryName(category)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Posts Grid */}
            {filteredPosts.length === 0 ? (
                <Card className="p-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No articles found</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        {posts.length === 0
                            ? "Check back soon for new content!"
                            : "Try adjusting your search or filters."}
                    </p>
                </Card>
            ) : (
                <>
                    <div className="text-sm text-slate-600">
                        Showing {filteredPosts.length} article{filteredPosts.length !== 1 ? "s" : ""}
                    </div>

                    <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredPosts.map((post) => {
                            const style = getCategoryStyle(post.category);
                            return (
                                <Link href={`/community/tips/${post.id}`} key={post.id}>
                                    <Card className="h-full transition-all hover:shadow-lg cursor-pointer group overflow-hidden">
                                        {/* Featured Image */}
                                        {post.featured_image_url && (
                                            <div className="aspect-video w-full overflow-hidden bg-slate-100">
                                                <img
                                                    src={post.featured_image_url}
                                                    alt={post.title}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        )}

                                        <div className="p-4 space-y-3">
                                            {/* Category Badge */}
                                            <div className="flex items-center justify-between">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style.bg} ${style.text}`}>
                                                    <Tag className="h-3 w-3" />
                                                    {formatCategoryName(post.category)}
                                                </span>
                                                {post.published_at && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(post.published_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2">
                                                {post.title}
                                            </h3>

                                            {/* Summary */}
                                            {post.summary && (
                                                <p className="text-sm text-slate-600 line-clamp-3">
                                                    {post.summary}
                                                </p>
                                            )}

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                {post.comment_count !== undefined && post.comment_count > 0 ? (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <MessageCircle className="h-3 w-3" />
                                                        {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}
                                                    </span>
                                                ) : (
                                                    <span></span>
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
