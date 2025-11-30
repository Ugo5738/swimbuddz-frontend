"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ArrowLeft, Calendar, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { apiEndpoints } from "@/lib/config";

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

    useEffect(() => {
        if (postId) {
            fetchPost();
            fetchComments();
        }
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
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            // TODO: Get actual member_id from auth context
            const memberId = "temp-member-id";

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
            <div className="mx-auto max-w-4xl py-12 text-center text-slate-600">
                Loading article...
            </div>
        );
    }

    if (!post) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 py-12 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Article not found</h2>
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

                    <div className="space-y-6 p-8">
                        {/* Title */}
                        <h1 className="text-3xl font-bold text-slate-900">{post.title}</h1>

                        {/* Meta */}
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(post.published_at), "MMMM d, yyyy")}</span>
                        </div>

                        {/* Summary */}
                        {post.summary && (
                            <p className="text-lg text-slate-700">{post.summary}</p>
                        )}

                        {/* Content (Markdown) */}
                        <div className="prose prose-slate max-w-none">
                            <ReactMarkdown>{post.body}</ReactMarkdown>
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
                                disabled={!newComment.trim() || submitting}
                            >
                                {submitting ? "Posting..." : "Post Comment"}
                            </Button>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                        {comments.length === 0 ? (
                            <p className="text-center text-sm text-slate-500">
                                No comments yet. Be the first to share your thoughts!
                            </p>
                        ) : (
                            comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                >
                                    <p className="text-sm text-slate-700">{comment.content}</p>
                                    <p className="mt-2 text-xs text-slate-500">
                                        {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
