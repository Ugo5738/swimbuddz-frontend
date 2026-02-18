"use client";

import { AnnouncementShareButtons } from "@/components/announcements/AnnouncementShareButtons";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/api";
import { formatAnnouncementCategory } from "@/lib/communications";
import { apiEndpoints } from "@/lib/config";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MessageCircle, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
}

interface Comment {
  id: string;
  member_id: string;
  member_name?: string;
  content: string;
  created_at: string;
}

export default function AnnouncementDetailPage() {
  const params = useParams();
  const announcementId = params.id as string;

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (announcementId) {
      fetchAnnouncement();
      fetchComments();
    }
    apiGet<{ id: string }>("/api/v1/members/me", { auth: true })
      .then((data) => setMemberId(data.id))
      .catch(() => {});
  }, [announcementId]);

  const fetchAnnouncement = async () => {
    try {
      const data = await apiGet<Announcement>(
        `/api/v1/communications/announcements/${announcementId}`,
        { auth: true },
      );
      setAnnouncement(data);
    } catch (error) {
      console.error("Failed to fetch announcement:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `${apiEndpoints.announcements}/${announcementId}/comments`,
      );
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
        `${apiEndpoints.announcements}/${announcementId}/comments?member_id=${memberId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment }),
        },
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
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-32"></div>
          <div className="h-10 bg-slate-200 rounded w-3/4"></div>
          <Card className="p-6 space-y-4">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </Card>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="space-y-6 text-center py-12">
        <h2 className="text-2xl font-bold text-slate-900">
          Announcement not found
        </h2>
        <p className="text-slate-600">
          The announcement you&apos;re looking for doesn&apos;t exist or has
          been removed.
        </p>
        <Link href="/announcements">
          <Button>Back to Announcements</Button>
        </Link>
      </div>
    );
  }

  // Generate share content from announcement
  const shareWhatsapp = `SwimBuddz update: ${announcement.title}`;
  const shareEmail = `Hi,\n\n${announcement.body}\n\nThanks!`;

  return (
    <div className="space-y-6">
      <Link
        href="/announcements"
        className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to announcements
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <Badge variant="info" className="capitalize">
            {formatAnnouncementCategory(announcement.category)}
          </Badge>
          {announcement.is_pinned && <Badge variant="warning">Pinned</Badge>}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <time dateTime={announcement.published_at}>
              {format(new Date(announcement.published_at), "MMMM d, yyyy")}
            </time>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          {announcement.title}
        </h1>
      </header>

      <Card className="p-6 space-y-6">
        <p className="text-lg text-slate-700 whitespace-pre-wrap">
          {announcement.body}
        </p>
        <AnnouncementShareButtons whatsapp={shareWhatsapp} email={shareEmail} />
      </Card>

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
                        {format(
                          new Date(comment.created_at),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 ml-10">
                    {comment.content}
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
