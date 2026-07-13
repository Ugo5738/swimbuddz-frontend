"use client";

import { parseBlockContent, serializeBlocks } from "@/components/editor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { apiGet } from "@/lib/api";
import { apiEndpoints } from "@/lib/config";
import { PartialBlock } from "@blocknote/core";
import { format } from "date-fns";
import {
  BookOpen,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentCadencePanel } from "./_components/ContentCadencePanel";
import type { ContentPost, ContentStatusFilter } from "./types";

// Dynamic import to avoid SSR issues with BlockNote
const BlockEditor = dynamic(
  () =>
    import("@/components/editor/BlockEditor").then((mod) => ({
      default: mod.BlockEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-slate-100 rounded-lg animate-pulse" />
    ),
  },
);

const BlockViewer = dynamic(
  () =>
    import("@/components/editor/BlockViewer").then((mod) => ({
      default: mod.BlockViewer,
    })),
  { ssr: false },
);

interface AdminMemberRef {
  id: string;
}

export default function AdminContentPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editorContent, setEditorContent] = useState<PartialBlock[]>([]);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<ContentStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    category: "swimming_tips",
    featured_image_url: "",
    featured_image_media_id: "",
    tier_access: "community",
    scheduled_for: "",
    email_on_publish: true,
  });

  const toDateTimeLocal = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const scheduledForPayload = () =>
    formData.scheduled_for
      ? new Date(formData.scheduled_for).toISOString()
      : null;

  const schedulePreset = (weekday: number, hour: number) => {
    const date = new Date();
    date.setSeconds(0, 0);
    date.setHours(hour, 0, 0, 0);
    const daysAhead = (weekday - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + daysAhead);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const applySchedulePreset = (value: string) => {
    const presets: Record<string, [number, number]> = {
      wednesday_7: [3, 7],
      friday_7: [5, 7],
      sunday_7: [0, 7],
    };
    const preset = presets[value];
    if (!preset) return;
    setFormData((current) => ({
      ...current,
      scheduled_for: schedulePreset(preset[0], preset[1]),
    }));
  };

  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(posts.map((post) => post.category))).sort()],
    [posts],
  );

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesStatus =
          statusFilter === "all" || post.status === statusFilter;
        const matchesCategory =
          categoryFilter === "all" || post.category === categoryFilter;
        const matchesTier = tierFilter === "all" || post.tier_access === tierFilter;
        return matchesStatus && matchesCategory && matchesTier;
      }),
    [categoryFilter, posts, statusFilter, tierFilter],
  );

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const fetchAdminMember = async () => {
      try {
        const member = await apiGet<AdminMemberRef>("/api/v1/members/me", {
          auth: true,
        });
        setCreatedBy(member.id);
      } catch (error) {
        console.error("Failed to resolve admin member id:", error);
      }
    };

    fetchAdminMember();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        `${apiEndpoints.content}/?published_only=false`,
      );
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = useCallback((blocks: PartialBlock[]) => {
    setEditorContent(blocks);
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!createdBy) {
        console.error("Missing admin member id. Unable to create post.");
        alert("Unable to create post. Please refresh and try again.");
        return;
      }

      const payload = {
        ...formData,
        body: serializeBlocks(editorContent),
        featured_image_url: formData.featured_image_url || null,
        featured_image_media_id: formData.featured_image_media_id || null,
        scheduled_for: scheduledForPayload(),
        email_on_publish: formData.email_on_publish,
      };

      const response = await fetch(
        `${apiEndpoints.content}/?created_by=${createdBy}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        await fetchPosts();
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPost) return;

    try {
      const payload = {
        title: formData.title,
        summary: formData.summary,
        body: serializeBlocks(editorContent),
        category: formData.category,
        tier_access: formData.tier_access,
        featured_image_url: formData.featured_image_url || null,
        featured_image_media_id: formData.featured_image_media_id || null,
        scheduled_for: scheduledForPayload(),
        email_on_publish: formData.email_on_publish,
      };

      const response = await fetch(
        `${apiEndpoints.content}/${editingPost.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        await fetchPosts();
      } else {
        const error = await response.json();
        console.error("Failed to update post:", error);
        alert("Failed to update post. Please try again.");
      }
    } catch (error) {
      console.error("Failed to update post:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (editingPost) {
      handleUpdatePost(e);
    } else {
      handleCreatePost(e);
    }
  };

  const handlePublishPost = async (postId: string) => {
    try {
      const response = await fetch(
        `${apiEndpoints.content}/${postId}/publish`,
        { method: "POST" },
      );

      if (response.ok) {
        await fetchPosts();
      }
    } catch (error) {
      console.error("Failed to publish post:", error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch(`${apiEndpoints.content}/${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchPosts();
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const handleEditPost = (post: ContentPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      summary: post.summary,
      category: post.category,
      featured_image_url: post.featured_image_url || "",
      featured_image_media_id: post.featured_image_media_id || "",
      tier_access: post.tier_access,
      scheduled_for: toDateTimeLocal(post.scheduled_for),
      email_on_publish: Boolean(post.email_on_publish),
    });
    // Parse existing content
    const blocks = parseBlockContent(post.body);
    if (blocks) {
      setEditorContent(blocks);
    }
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      summary: "",
      category: "swimming_tips",
      featured_image_url: "",
      featured_image_media_id: "",
      tier_access: "community",
      scheduled_for: "",
      email_on_publish: true,
    });
    setEditorContent([]);
    setEditingPost(null);
    setIsFullscreen(false);
    setShowPreview(false);
  };

  const editorModalClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-white overflow-auto"
    : "";

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Content Management
          </h1>
          <p className="mt-2 text-slate-600">
            Create and manage swimming tips & articles with Notion-style editing
          </p>
        </div>
        {!showCreateModal && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 w-fit"
          >
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        )}
      </div>

      {!showCreateModal && (
        <>
          <ContentCadencePanel posts={posts} />

          <Card className="p-4">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["all", "draft", "scheduled", "published"] as const).map(
                    (status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={
                          statusFilter === status ? "primary" : "secondary"
                        }
                        onClick={() => setStatusFilter(status)}
                        className="capitalize"
                      >
                        {status}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category === "all"
                      ? "All categories"
                      : category.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>

              <Select
                label="Tier"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="all">All tiers</option>
                <option value="community">Community</option>
                <option value="club">Club</option>
                <option value="academy">Academy</option>
              </Select>
            </div>
          </Card>
        </>
      )}

      {/* Create/Edit Post Modal */}
      {showCreateModal && (
        <div className={editorModalClasses}>
          <Card
            className={`p-6 ${isFullscreen ? "min-h-screen rounded-none" : ""}`}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Header with title and controls */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingPost ? "Edit Post" : "Create New Post"}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title={showPreview ? "Hide Preview" : "Show Preview"}
                  >
                    {showPreview ? (
                      <EyeOff className="h-5 w-5 text-slate-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-5 w-5 text-slate-600" />
                    ) : (
                      <Maximize2 className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              <Input
                label="Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="e.g., 5 Tips for Better Breathing Technique"
              />

              <Input
                label="Summary (shown in article list)"
                value={formData.summary}
                onChange={(e) =>
                  setFormData({ ...formData, summary: e.target.value })
                }
                required
                placeholder="Brief summary to entice readers..."
              />

              <MediaInput
                label="Featured Image (displayed at top of article)"
                purpose="content_image"
                mode="both"
                value={formData.featured_image_media_id || null}
                onChange={(mediaId, fileUrl) =>
                  setFormData({
                    ...formData,
                    featured_image_media_id: mediaId || "",
                    featured_image_url: fileUrl || "",
                  })
                }
              />

              {/* Block Editor / Preview */}
              {showPreview ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Preview
                  </label>
                  <div className="border border-slate-200 rounded-lg p-6 bg-white min-h-[400px]">
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">
                      {formData.title || "Untitled"}
                    </h1>
                    {formData.featured_image_url && (
                      <div className="mb-6 -mx-6 -mt-2">
                        <Image
                          src={formData.featured_image_url}
                          alt="Featured"
                          width={0}
                          height={0}
                          sizes="(max-width: 768px) 100vw, 800px"
                          className="w-full max-h-96 object-contain bg-slate-100"
                          style={{ width: "100%", height: "auto" }}
                        />
                      </div>
                    )}
                    <BlockViewer content={serializeBlocks(editorContent)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Content{" "}
                    <span className="text-slate-400 font-normal">
                      — Type &apos;/&apos; for commands, drag blocks to reorder
                    </span>
                  </label>
                  <BlockEditor
                    initialContent={
                      editorContent.length > 0 ? editorContent : undefined
                    }
                    onChange={handleEditorChange}
                    placeholder="Start writing your article... Type '/' for block options"
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  required
                >
                  <option value="getting_started">Getting Started</option>
                  <option value="swimming_tips">Swimming Tips</option>
                  <option value="safety">Safety</option>
                  <option value="breathing">Breathing Techniques</option>
                  <option value="technique">Technique</option>
                  <option value="health_recovery">Health &amp; Recovery</option>
                  <option value="community_culture">
                    Community &amp; Culture
                  </option>
                  <option value="news">News</option>
                  <option value="education">Education</option>
                </Select>

                <Select
                  label="Tier Access"
                  value={formData.tier_access}
                  onChange={(e) =>
                    setFormData({ ...formData, tier_access: e.target.value })
                  }
                  required
                >
                  <option value="community">Community (All Members)</option>
                  <option value="club">Club Members Only</option>
                  <option value="academy">Academy Members Only</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Cadence preset"
                  value=""
                  onChange={(e) => applySchedulePreset(e.target.value)}
                >
                  <option value="">Custom schedule</option>
                  <option value="wednesday_7">Next Wednesday, 7 AM</option>
                  <option value="friday_7">Next Friday, 7 AM</option>
                  <option value="sunday_7">Next Sunday, 7 AM</option>
                </Select>

                <Input
                  label="Schedule publish time"
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_for: e.target.value,
                    })
                  }
                  hint="Leave blank to keep this as a draft until manually published."
                />

                <div className="flex items-end pb-2">
                  <Checkbox
                    checked={formData.email_on_publish}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email_on_publish: e.target.checked,
                      })
                    }
                    label="Email members when published"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPost
                    ? "Update Post"
                    : formData.scheduled_for
                      ? "Create Scheduled Post"
                      : "Create Draft"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="py-12 text-center text-slate-600">Loading posts...</div>
      ) : posts.length === 0 && !showCreateModal ? (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No posts created yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Create your first post to get started!
          </p>
        </Card>
      ) : filteredPosts.length === 0 && !showCreateModal ? (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No posts match these filters
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Adjust the status, category, or tier filters to widen the view.
          </p>
        </Card>
      ) : filteredPosts.length > 0 && !showCreateModal ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {post.title}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        post.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : post.status === "scheduled"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{post.summary}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Category:</span>{" "}
                      {post.category}
                    </div>
                    <div>
                      <span className="font-medium">Access:</span>{" "}
                      {post.tier_access}
                    </div>
                    {post.published_at && (
                      <div>
                        <span className="font-medium">Published:</span>{" "}
                        {format(new Date(post.published_at), "MMM d, yyyy")}
                      </div>
                    )}
                    {post.scheduled_for && post.status !== "published" && (
                      <div>
                        <span className="font-medium">Scheduled:</span>{" "}
                        {format(
                          new Date(post.scheduled_for),
                          "MMM d, yyyy h:mm a",
                        )}
                      </div>
                    )}
                    {post.email_on_publish && (
                      <div>
                        <span className="font-medium">Email on publish:</span>{" "}
                        Yes
                      </div>
                    )}
                    {(post.email_sent_count > 0 ||
                      post.email_failed_count > 0) && (
                      <div>
                        <span className="font-medium">Email result:</span>{" "}
                        {post.email_sent_count} sent
                        {post.email_failed_count
                          ? `, ${post.email_failed_count} failed`
                          : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleEditPost(post)}
                  >
                    Edit
                  </Button>
                  {post.status !== "published" && (
                    <Button onClick={() => handlePublishPost(post.id)}>
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
