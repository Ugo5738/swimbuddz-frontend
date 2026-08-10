"use client";

import { ArticleFeaturedImage } from "@/components/content/ArticleFeaturedImage";
import { ArticleReadingProgress } from "@/components/content/ArticleReadingProgress";
import { BlockViewer } from "@/components/editor/BlockViewer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Textarea } from "@/components/ui/Textarea";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiPost } from "@/lib/api";
import { supabase } from "@/lib/auth";
import { estimateArticleReadingTime } from "@/lib/readingTime";
import { format } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Lock,
  MessageCircle,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ContentPost {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  tier_access: string;
  featured_image_url: string | null;
  published_at: string;
  created_at: string;
  status: string;
}

interface Comment {
  id: string;
  member_id: string;
  member_name?: string;
  content: string;
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

export default function TipDetailPage() {
  const params = useParams();
  const postId = params?.id as string;
  const contentRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Primary post fetch. useApi handles abort/unmount + maps non-2xx + network
  // errors into a string. We layer the content-based access checks (status,
  // tier_access) on top of the loaded payload.
  const {
    data: postData,
    loading,
    error: fetchError,
  } = useApi<ContentPost>(postId ? `/api/v1/content/${postId}` : null, {
    auth: false,
  });

  const error: string | null = fetchError
    ? "Failed to load article."
    : postData && postData.status !== "published"
      ? "This article is not available."
      : postData && postData.tier_access !== "community"
        ? "This article is only available to members."
        : null;

  // Only render the post once we've cleared the content-based access gates.
  const post: ContentPost | null = postData && !error ? postData : null;

  // Related posts: fetch only after we have a valid post + category. Passing
  // `null` to useApi short-circuits the request.
  const { data: relatedData } = useApi<ContentPost[]>(
    post ? `/api/v1/content/?published_only=true&category=${post.category}` : null,
    { auth: false }
  );

  const relatedPosts = useMemo(
    () =>
      (relatedData ?? [])
        .filter((p) => p.id !== postId && p.tier_access === "community")
        .slice(0, 3),
    [relatedData, postId]
  );
  const readingTimeMinutes = useMemo(() => estimateArticleReadingTime(post?.body), [post?.body]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      const data = await apiGet<Comment[]>(`/api/v1/content/${postId}/comments`, {
        auth: false,
      });
      setComments(data);
      setCommentError(null);
    } catch (commentsError) {
      console.error("Failed to fetch article comments:", commentsError);
      setCommentError("Comments could not be loaded.");
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void fetchComments();
    void supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session));
    });
  }, [fetchComments]);

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setCommentError(null);
    try {
      await apiPost<Comment>(`/api/v1/content/${postId}/comments`, { content }, { auth: true });
      setNewComment("");
      await fetchComments();
    } catch (submitError) {
      console.error("Failed to add article comment:", submitError);
      setCommentError("Your comment could not be posted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading article..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/tips"
          className="inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tips
        </Link>

        <Card className="p-12 text-center">
          {error.includes("members") ? (
            <>
              <Lock className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Members Only Content</h3>
              <p className="mt-2 text-slate-600 max-w-md mx-auto">
                This article is exclusively available to SwimBuddz members. Join us to access all
                our premium content!
              </p>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
              >
                Join SwimBuddz
              </Link>
            </>
          ) : (
            <>
              <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{error}</h3>
              <Link
                href="/tips"
                className="mt-6 inline-flex items-center justify-center px-6 py-3 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
              >
                Browse All Tips
              </Link>
            </>
          )}
        </Card>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="space-y-10">
      {/* Back Link */}
      <Link
        href="/tips"
        className="inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Tips
      </Link>

      {/* Article */}
      <article className="max-w-3xl mx-auto">
        <ArticleReadingProgress contentRef={contentRef} minutes={readingTimeMinutes} />

        {/* Header */}
        <header className="space-y-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${
                categoryColors[post.category] || categoryColors.general
              }`}
            >
              {categoryLabels[post.category] || post.category}
            </span>
            {post.published_at && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.published_at), "MMMM d, yyyy")}
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
            {post.title}
          </h1>

          <p className="text-lg text-slate-600">{post.summary}</p>
        </header>

        {/* Featured Image */}
        {post.featured_image_url && (
          <ArticleFeaturedImage
            src={post.featured_image_url}
            alt={post.title}
            variant="detail"
            className="mb-8 rounded-2xl"
            priority
          />
        )}

        {/* Content */}
        <div ref={contentRef} className="prose prose-slate prose-lg max-w-none">
          <BlockViewer content={post.body} />
        </div>
      </article>

      {/* Public conversation: everyone can read; members sign in to participate. */}
      <Card className="max-w-3xl mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Comments ({comments.length})</h2>
          </div>

          {isLoggedIn ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
                  {submitting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="font-medium text-slate-900">Join the conversation</p>
                <p className="mt-1 text-sm text-slate-600">
                  Anyone can read this article and its comments. Log in to add your own.
                </p>
              </div>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/tips/${postId}`)}`}
                className="mt-3 inline-flex shrink-0 items-center justify-center rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 sm:mt-0"
              >
                Log in to comment
              </Link>
            </div>
          )}

          {commentError && <p className="text-sm text-red-600">{commentError}</p>}

          <div className="space-y-4 border-t border-slate-200 pt-6">
            {commentsLoading ? (
              <p className="py-4 text-center text-sm text-slate-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100">
                      <User className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {comment.member_name || "SwimBuddz member"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <p className="ml-10 whitespace-pre-wrap text-sm text-slate-700">
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-slate-200 pt-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            More {categoryLabels[post.category] || post.category} Tips
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {relatedPosts.map((relatedPost) => (
              <Link key={relatedPost.id} href={`/tips/${relatedPost.id}`}>
                <Card className="group h-full hover:shadow-lg transition-all duration-300">
                  {relatedPost.featured_image_url ? (
                    <ArticleFeaturedImage
                      src={relatedPost.featured_image_url}
                      alt={relatedPost.title}
                      variant="card"
                      className="rounded-t-xl"
                    />
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center rounded-t-xl">
                      <BookOpen className="h-8 w-8 text-cyan-400" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-cyan-600">
                      Read
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <Card className="p-8 bg-gradient-to-br from-cyan-50 to-white border-cyan-100 text-center">
        <h3 className="text-xl font-semibold text-slate-900">Want more personalized guidance?</h3>
        <p className="mt-2 text-slate-600 max-w-xl mx-auto">
          Join SwimBuddz to get access to coaches, structured programs, and a supportive community
          to help you achieve your swimming goals.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
          >
            Join SwimBuddz
          </Link>
          <Link
            href="/tips"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            Browse More Tips
          </Link>
        </div>
      </Card>
    </div>
  );
}
