"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/api";
import { apiEndpoints } from "@/lib/config";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MessageCircle, User } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Dynamic import to avoid SSR issues with BlockNote
const BlockViewer = dynamic(
    () => import("@/components/editor/BlockViewer").then(mod => ({ default: mod.BlockViewer })),
    {
        ssr: false,
        loading: () => <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/5"></div>
        </div>
    }
);

interface ContentPost {
    id: string;
    title: string;
    summary: string;
    body: string;
    category: string;
    featured_image_url: string | null;
    published_at: string;
    tier_access: string;
    created_by: string;
    created_at: string;
}

interface Comment {
    id: string;
    member_id: string;
    member_name?: string;
    content: string;
    created_at: string;
}

export default function ContentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.id as string;

    const [post, setPost] = useState<ContentPost | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [memberId, setMemberId] = useState<string | null>(null);

    useEffect(() => {
        if (postId) {
            fetchPost();
            fetchComments();
        }
        // Get current member ID for commenting
        apiGet<{ id: string }>("/api/v1/members/me", { auth: true })
            .then((data) => setMemberId(data.id))
            .catch(() => {});
    }, [postId]);

    const fetchPost = async () => {
        try {
            const response = await fetch(`${apiEndpoints.content}/${postId}`);
            if (response.ok) {
                const data = await response.json();
                setPost(data);
            }
        } catch (error) {
            console.error("Failed to fetch post:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await fetch(`${apiEndpoints.content}/${postId}/comments`);
            if (response.ok) {
                const data = await response.json();
                setComments(data);
            }
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !memberId) return;

        setSubmitting(true);
        try {
            const response = await fetch(
                `${apiEndpoints.content}/${postId}/comments?member_id=${memberId}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: newComment }),
                }
            );

            if (response.ok) {
                setNewComment("");
                await fetchComments();
            }
        } catch (error) {
            console.error("Failed to add comment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-4xl py-12">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-slate-200 rounded w-32"></div>
                    <Card className="p-8 space-y-6">
                        <div className="h-10 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-40"></div>
                        <div className="space-y-3">
                            <div className="h-4 bg-slate-200 rounded"></div>
                            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                            <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 py-12 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Article not found</h2>
                <p className="text-slate-600">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                <Button onClick={() => router.push("/community/tips")}>
                    Back to Tips
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8 py-8">
            {/* Back Button */}
            <Button
                variant="secondary"
                onClick={() => router.push("/community/tips")}
                className="flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Tips
            </Button>

            {/* Article */}
            <article>
                <Card className="overflow-hidden">
                    {/* Featured Image */}
                    {post.featured_image_url && (
                        <div className="aspect-video w-full overflow-hidden bg-slate-100">
                            <img
                                src={post.featured_image_url}
                                alt={post.title}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}

                    <div className="p-8">
                        {/* Category Badge */}
                        <div className="mb-4">
                            <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-700 capitalize">
                                {post.category.replace(/_/g, " ")}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            {post.title}
                        </h1>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-8 pb-6 border-b border-slate-200">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(post.published_at), "MMMM d, yyyy")}</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                <span>SwimBuddz Team</span>
                            </div>
                        </div>

                        {/* Summary */}
                        {post.summary && (
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                {post.summary}
                            </p>
                        )}

                        {/* Content (Notion-style blocks or markdown fallback) */}
                        <div className="article-content">
                            <BlockViewer content={post.body} />
                        </div>
                    </div>
                </Card>
            </article>

            {/* Comments Section */}
            <Card className="p-6">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-slate-600" />
                        <h3 className="text-lg font-semibold text-slate-900">
                            Comments ({comments.length})
                        </h3>
                    </div>

                    {/* Add Comment */}
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Share your thoughts..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                        />
                        <div className="flex justify-end">
                            <Button
                                onClick={handleAddComment}
                                disabled={!newComment.trim() || submitting || !memberId}
                            >
                                {submitting ? "Posting..." : "Post Comment"}
                            </Button>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                        {comments.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-4">
                                No comments yet. Be the first to share your thoughts!
                            </p>
                        ) : (
                            comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-cyan-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {comment.member_name || "Member"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-700 ml-10">{comment.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
