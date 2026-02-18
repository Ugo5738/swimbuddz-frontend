"use client";

import { BlockViewer } from "@/components/editor/BlockViewer";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiEndpoints } from "@/lib/config";
import { format } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

  const [post, setPost] = useState<ContentPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${apiEndpoints.content}/${postId}`);
      if (response.ok) {
        const data = await response.json();

        // Check if post is published and accessible
        if (data.status !== "published") {
          setError("This article is not available.");
          return;
        }

        // Check tier access - only show community posts to public
        if (data.tier_access !== "community") {
          setError("This article is only available to members.");
          return;
        }

        setPost(data);

        // Fetch related posts in same category
        const relatedResponse = await fetch(
          `${apiEndpoints.content}/?published_only=true&category=${data.category}`,
        );
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          const filtered = relatedData
            .filter(
              (p: ContentPost) =>
                p.id !== postId && p.tier_access === "community",
            )
            .slice(0, 3);
          setRelatedPosts(filtered);
        }
      } else if (response.status === 404) {
        setError("Article not found.");
      } else {
        setError("Failed to load article.");
      }
    } catch (err) {
      console.error("Failed to fetch post:", err);
      setError("Failed to load article.");
    } finally {
      setLoading(false);
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Members Only Content
              </h3>
              <p className="mt-2 text-slate-600 max-w-md mx-auto">
                This article is exclusively available to SwimBuddz members. Join
                us to access all our premium content!
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {error}
              </h3>
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
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full max-h-96 object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-slate prose-lg max-w-none">
          <BlockViewer content={post.body} />
        </div>
      </article>

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
                    <div className="aspect-video overflow-hidden bg-slate-100 rounded-t-xl">
                      <img
                        src={relatedPost.featured_image_url}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
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
        <h3 className="text-xl font-semibold text-slate-900">
          Want more personalized guidance?
        </h3>
        <p className="mt-2 text-slate-600 max-w-xl mx-auto">
          Join SwimBuddz to get access to coaches, structured programs, and a
          supportive community to help you achieve your swimming goals.
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
