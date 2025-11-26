"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Plus, BookOpen, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ContentPost {
    id: string;
    title: string;
    summary: string;
    body: string;
    category: string;
    featured_image_url: string | null;
    status: string;
    tier_access: string;
    published_at: string | null;
    created_at: string;
}

export default function AdminContentPage() {
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        summary: "",
        body: "",
        category: "swimming_tips",
        featured_image_url: "",
        tier_access: "community",
    });

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/v1/content/?published_only=false");
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

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // TODO: Get created_by from auth context
            const createdBy = "temp-admin-id";

            const payload = {
                ...formData,
                featured_image_url: formData.featured_image_url || null,
            };

            const response = await fetch(
                `http://localhost:8000/api/v1/content/?created_by=${createdBy}`,
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
                `http://localhost:8000/api/v1/content/${postId}/publish`,
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
            const response = await fetch(`http://localhost:8000/api/v1/content/${postId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                await fetchPosts();
            }
        } catch (error) {
            console.error("Failed to delete post:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            summary: "",
            body: "",
            category: "swimming_tips",
            featured_image_url: "",
            tier_access: "community",
        });
        setEditingPost(null);
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Content Management</h1>
                    <p className="mt-2 text-slate-600">Create and manage swimming tips & articles</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Post
                </Button>
            </div>

            {/* Create/Edit Post Modal */}
            {showCreateModal && (
                <Card className="p-6">
                    <form onSubmit={handleCreatePost} className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">
                            {editingPost ? "Edit Post" : "Create New Post"}
                        </h2>

                        <Input
                            label="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="e.g., 5 Tips for Better Breathing Technique"
                        />

                        <Textarea
                            label="Summary"
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            required
                            rows={2}
                            placeholder="Brief summary shown in the list..."
                        />

                        <Textarea
                            label="Body (Markdown supported)"
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            required
                            rows={10}
                            placeholder="Write your article content here. You can use Markdown formatting..."
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                            <Select
                                label="Category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                <option value="swimming_tips">Swimming Tips</option>
                                <option value="safety">Safety</option>
                                <option value="breathing">Breathing Techniques</option>
                                <option value="technique">Technique</option>
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

                        <Input
                            label="Featured Image URL (Optional)"
                            value={formData.featured_image_url}
                            onChange={(e) =>
                                setFormData({ ...formData, featured_image_url: e.target.value })
                            }
                            placeholder="https://example.com/image.jpg"
                        />

                        <div className="flex justify-end gap-3">
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
            )}

            {/* Posts List */}
            {loading ? (
                <div className="py-12 text-center text-slate-600">Loading posts...</div>
            ) : posts.length === 0 ? (
                <Card className="p-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No posts created yet</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Create your first post to get started!
                    </p>
                </Card>
            ) : (
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
            )}
        </div>
    );
}
