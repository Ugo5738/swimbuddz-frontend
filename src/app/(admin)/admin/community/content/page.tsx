"use client";

import { parseBlockContent, serializeBlocks } from "@/components/editor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { apiGet } from "@/lib/api";
import { apiEndpoints } from "@/lib/config";
import { PartialBlock } from "@blocknote/core";
import { format } from "date-fns";
import { BookOpen, Eye, EyeOff, Maximize2, Minimize2, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

// Dynamic import to avoid SSR issues with BlockNote
const BlockEditor = dynamic(
    () => import("@/components/editor/BlockEditor").then(mod => ({ default: mod.BlockEditor })),
    { ssr: false, loading: () => <div className="h-96 bg-slate-100 rounded-lg animate-pulse" /> }
);

const BlockViewer = dynamic(
    () => import("@/components/editor/BlockViewer").then(mod => ({ default: mod.BlockViewer })),
    { ssr: false }
);

interface ContentPost {
    id: string;
    title: string;
    summary: string;
    body: string;
    category: string;
    featured_image_url: string | null;
    featured_image_media_id: string | null;
    status: string;
    tier_access: string;
    published_at: string | null;
    created_at: string;
}

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
    const [formData, setFormData] = useState({
        title: "",
        summary: "",
        category: "swimming_tips",
        featured_image_url: "",
        featured_image_media_id: "",
        tier_access: "community",
    });

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        const fetchAdminMember = async () => {
            try {
                const member = await apiGet<AdminMemberRef>("/api/v1/members/me", { auth: true });
                setCreatedBy(member.id);
            } catch (error) {
                console.error("Failed to resolve admin member id:", error);
            }
        };

        fetchAdminMember();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await fetch(`${apiEndpoints.content}/?published_only=false`);
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
            };

            const response = await fetch(
                `${apiEndpoints.content}/?created_by=${createdBy}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
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

    const handlePublishPost = async (postId: string) => {
        try {
            const response = await fetch(
                `${apiEndpoints.content}/${postId}/publish`,
                { method: "POST" }
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Content Management</h1>
                    <p className="mt-2 text-slate-600">Create and manage swimming tips & articles with Notion-style editing</p>
                </div>
                {!showCreateModal && (
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 w-fit">
                        <Plus className="h-4 w-4" />
                        Create Post
                    </Button>
                )}
            </div>

            {/* Create/Edit Post Modal */}
            {showCreateModal && (
                <div className={editorModalClasses}>
                    <Card className={`p-6 ${isFullscreen ? 'min-h-screen rounded-none' : ''}`}>
                        <form onSubmit={handleCreatePost} className="space-y-4">
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
                                        {showPreview ? <EyeOff className="h-5 w-5 text-slate-600" /> : <Eye className="h-5 w-5 text-slate-600" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                    >
                                        {isFullscreen ? <Minimize2 className="h-5 w-5 text-slate-600" /> : <Maximize2 className="h-5 w-5 text-slate-600" />}
                                    </button>
                                </div>
                            </div>

                            <Input
                                label="Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="e.g., 5 Tips for Better Breathing Technique"
                            />

                            <Input
                                label="Summary (shown in article list)"
                                value={formData.summary}
                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                required
                                placeholder="Brief summary to entice readers..."
                            />

                            <MediaInput
                                label="Featured Image (displayed at top of article)"
                                purpose="content_image"
                                mode="both"
                                value={formData.featured_image_media_id || null}
                                onChange={(mediaId, fileUrl) => setFormData({
                                    ...formData,
                                    featured_image_media_id: mediaId || "",
                                    featured_image_url: fileUrl || ""
                                })}
                            />

                            {/* Block Editor / Preview */}
                            {showPreview ? (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Preview</label>
                                    <div className="border border-slate-200 rounded-lg p-6 bg-white min-h-[400px]">
                                        <h1 className="text-3xl font-bold text-slate-900 mb-4">{formData.title || "Untitled"}</h1>
                                        {formData.featured_image_url && (
                                            <div className="mb-6 -mx-6 -mt-2">
                                                <img
                                                    src={formData.featured_image_url}
                                                    alt="Featured"
                                                    className="w-full h-64 object-cover"
                                                />
                                            </div>
                                        )}
                                        <BlockViewer content={serializeBlocks(editorContent)} />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Content <span className="text-slate-400 font-normal">— Type &apos;/&apos; for commands, drag blocks to reorder</span>
                                    </label>
                                    <BlockEditor
                                        initialContent={editorContent.length > 0 ? editorContent : undefined}
                                        onChange={handleEditorChange}
                                        placeholder="Start writing your article... Type '/' for block options"
                                    />
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <Select
                                    label="Category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    <option value="getting_started">Getting Started</option>
                                    <option value="swimming_tips">Swimming Tips</option>
                                    <option value="safety">Safety</option>
                                    <option value="breathing">Breathing Techniques</option>
                                    <option value="technique">Technique</option>
                                    <option value="health_recovery">Health &amp; Recovery</option>
                                    <option value="community_culture">Community &amp; Culture</option>
                                    <option value="news">News</option>
                                    <option value="education">Education</option>
                                </Select>

                                <Select
                                    label="Tier Access"
                                    value={formData.tier_access}
                                    onChange={(e) => setFormData({ ...formData, tier_access: e.target.value })}
                                    required
                                >
                                    <option value="community">Community (All Members)</option>
                                    <option value="club">Club Members Only</option>
                                    <option value="academy">Academy Members Only</option>
                                </Select>
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
                                    {editingPost ? "Update Post" : "Create Draft"}
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
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No posts created yet</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Create your first post to get started!
                    </p>
                </Card>
            ) : posts.length > 0 && !showCreateModal ? (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <Card key={post.id} className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-slate-900">{post.title}</h3>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${post.status === "published"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {post.status}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-600">{post.summary}</p>

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                        <div>
                                            <span className="font-medium">Category:</span> {post.category}
                                        </div>
                                        <div>
                                            <span className="font-medium">Access:</span> {post.tier_access}
                                        </div>
                                        {post.published_at && (
                                            <div>
                                                <span className="font-medium">Published:</span>{" "}
                                                {format(new Date(post.published_at), "MMM d, yyyy")}
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
                                    {post.status === "draft" && (
                                        <Button onClick={() => handlePublishPost(post.id)}>Publish</Button>
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
