"use client";

import { ArticleFeaturedImage } from "@/components/content/ArticleFeaturedImage";
import {
  ArticleCommentActions,
  type CommentReaction,
} from "@/components/content/ArticleCommentActions";
import { ArticleReadingProgress } from "@/components/content/ArticleReadingProgress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/auth";
import { estimateArticleReadingTime } from "@/lib/readingTime";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MessageCircle, User } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Dynamic import to avoid SSR issues with BlockNote
const BlockViewer = dynamic(
  () =>
    import("@/components/editor/BlockViewer").then((mod) => ({
      default: mod.BlockViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        <div className="h-4 bg-slate-200 rounded w-4/5"></div>
      </div>
    ),
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
  like_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const contentRef = useRef<HTMLDivElement>(null);

  const [post, setPost] = useState<ContentPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const roles = data.user?.app_metadata?.roles;
      setIsAdmin(Array.isArray(roles) && roles.includes("admin"));
    });
  }, []);

  const fetchPost = async () => {
    try {
      const data = await apiGet<ContentPost>(`/api/v1/content/${postId}`, { auth: true });
      setPost(data);
    } catch (error) {
      console.error("Failed to fetch post:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await apiGet<Comment[]>(`/api/v1/content/${postId}/comments`, { auth: true });
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await apiPost<Comment>(
        `/api/v1/content/${postId}/comments`,
        { content: newComment },
        { auth: true }
      );
      setNewComment("");
      await fetchComments();
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = (reaction: CommentReaction) => {
    setComments((current) =>
      current.map((comment) =>
        comment.id === reaction.comment_id
          ? {
              ...comment,
              like_count: reaction.like_count,
              liked_by_me: reaction.liked_by_me,
            }
          : comment
      )
    );
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments((current) => current.filter((comment) => comment.id !== commentId));
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
        <p className="text-slate-600">
          The article you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button onClick={() => router.push("/community/tips")}>Back to Tips</Button>
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
        <ArticleReadingProgress
          contentRef={contentRef}
          minutes={estimateArticleReadingTime(post.body)}
        />

        <Card className="overflow-hidden">
          {/* Featured Image */}
          {post.featured_image_url && (
            <ArticleFeaturedImage src={post.featured_image_url} alt={post.title} variant="detail" />
          )}

          <div className="p-8">
            {/* Category Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-700 capitalize">
                {post.category.replace(/_/g, " ")}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{post.title}</h1>

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
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">{post.summary}</p>
            )}

            {/* Content (Notion-style blocks or markdown fallback) */}
            <div ref={contentRef} className="article-content">
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
            <h3 className="text-lg font-semibold text-slate-900">Comments ({comments.length})</h3>
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
              <Button onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
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
                  <ArticleCommentActions
                    postId={postId}
                    commentId={comment.id}
                    likeCount={comment.like_count}
                    likedByMe={comment.liked_by_me}
                    isLoggedIn
                    isAdmin={isAdmin}
                    loginHref={`/login?redirect=${encodeURIComponent(`/community/tips/${postId}`)}`}
                    onReaction={handleReaction}
                    onDeleted={() => handleCommentDeleted(comment.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
