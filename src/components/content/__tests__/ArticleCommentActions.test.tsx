import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ArticleCommentActions } from "../ArticleCommentActions";

const apiPut = vi.fn();
const apiDelete = vi.fn();

vi.mock("@/lib/api", () => ({
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const baseProps = {
  postId: "post-1",
  commentId: "comment-1",
  likeCount: 3,
  likedByMe: false,
  isLoggedIn: true,
  isAdmin: false,
  loginHref: "/login?redirect=%2Ftips%2Fpost-1",
  onReaction: vi.fn(),
  onDeleted: vi.fn(),
};

describe("ArticleCommentActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("likes a comment through the authenticated reaction endpoint", async () => {
    const reaction = { comment_id: "comment-1", like_count: 4, liked_by_me: true };
    apiPut.mockResolvedValue(reaction);
    const onReaction = vi.fn();
    render(<ArticleCommentActions {...baseProps} onReaction={onReaction} />);

    fireEvent.click(screen.getByRole("button", { name: "Like comment" }));

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith(
        "/api/v1/content/post-1/comments/comment-1/like",
        undefined,
        { auth: true }
      )
    );
    expect(onReaction).toHaveBeenCalledWith(reaction);
  });

  it("sends anonymous readers to login without hiding the like count", () => {
    render(<ArticleCommentActions {...baseProps} isLoggedIn={false} />);

    const loginLink = screen.getByRole("link", { name: "Log in to like comment" });
    expect(loginLink).toHaveAttribute("href", baseProps.loginHref);
    expect(loginLink).toHaveTextContent("3");
  });

  it("allows admins to delete one comment after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    apiDelete.mockResolvedValue(null);
    const onDeleted = vi.fn();
    render(<ArticleCommentActions {...baseProps} isAdmin onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete comment" }));

    await waitFor(() =>
      expect(apiDelete).toHaveBeenCalledWith(
        "/api/v1/content/post-1/comments/comment-1",
        { auth: true }
      )
    );
    expect(onDeleted).toHaveBeenCalledOnce();
  });
});
