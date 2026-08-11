"use client";

import { apiDelete, apiPut } from "@/lib/api";
import { Heart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export type CommentReaction = {
  comment_id: string;
  like_count: number;
  liked_by_me: boolean;
};

type ArticleCommentActionsProps = {
  postId: string;
  commentId: string;
  likeCount: number;
  likedByMe: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  loginHref: string;
  onReaction: (reaction: CommentReaction) => void;
  onDeleted: () => void;
};

export function ArticleCommentActions({
  postId,
  commentId,
  likeCount,
  likedByMe,
  isLoggedIn,
  isAdmin,
  loginHref,
  onReaction,
  onDeleted,
}: ArticleCommentActionsProps) {
  const [reactionSaving, setReactionSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleLike = async () => {
    if (reactionSaving) return;
    setReactionSaving(true);
    try {
      const path = `/api/v1/content/${postId}/comments/${commentId}/like`;
      const reaction = likedByMe
        ? await apiDelete<CommentReaction>(path, { auth: true })
        : await apiPut<CommentReaction>(path, undefined, { auth: true });
      onReaction(reaction);
    } catch (error) {
      console.error("Failed to update comment like:", error);
      toast.error("Could not update this like");
    } finally {
      setReactionSaving(false);
    }
  };

  const deleteComment = async () => {
    if (deleting) return;
    const confirmed = window.confirm(
      "Delete this comment? This removes it permanently for everyone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await apiDelete(`/api/v1/content/${postId}/comments/${commentId}`, {
        auth: true,
      });
      onDeleted();
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Could not delete this comment");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-3 ml-10 flex items-center gap-2">
      {isLoggedIn ? (
        <button
          type="button"
          onClick={toggleLike}
          disabled={reactionSaving}
          aria-pressed={likedByMe}
          aria-label={likedByMe ? "Unlike comment" : "Like comment"}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            likedByMe
              ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "text-slate-600 hover:bg-slate-100 hover:text-rose-700"
          }`}
        >
          <Heart className={`h-4 w-4 ${likedByMe ? "fill-current" : ""}`} />
          <span>{likeCount}</span>
        </button>
      ) : (
        <Link
          href={loginHref}
          aria-label="Log in to like comment"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-rose-700"
        >
          <Heart className="h-4 w-4" />
          <span>{likeCount}</span>
        </Link>
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={deleteComment}
          disabled={deleting}
          aria-label="Delete comment"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          <span>{deleting ? "Deleting..." : "Delete"}</span>
        </button>
      )}
    </div>
  );
}
