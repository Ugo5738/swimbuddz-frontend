"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AdminAgreementApi } from "@/lib/coaches";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewAgreementVersionPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const [version, setVersion] = useState("");
    const [title, setTitle] = useState("SwimBuddz Coach Agreement");
    const [content, setContent] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!version.trim()) {
            setError("Version is required (e.g., 2.0)");
            return;
        }
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        if (!content.trim() || content.trim().length < 100) {
            setError(
                "Agreement content must be at least 100 characters"
            );
            return;
        }
        if (!effectiveDate) {
            setError("Effective date is required");
            return;
        }

        setSubmitting(true);
        try {
            await AdminAgreementApi.create({
                version: version.trim(),
                title: title.trim(),
                content: content.trim(),
                effective_date: effectiveDate,
            });
            router.push("/admin/coaches/agreements");
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to create agreement version";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    // Simple markdown-to-HTML renderer for preview
    const renderMarkdown = (md: string) => {
        return md
            .replace(/^### (.+)$/gm, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
            .replace(/^## (.+)$/gm, "<h2 class='text-xl font-semibold mt-6 mb-2'>$1</h2>")
            .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold mt-6 mb-3'>$1</h1>")
            .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
            .replace(/\n\n/g, "<br/><br/>")
            .replace(/\n/g, "<br/>");
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/coaches/agreements"
                    className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Create New Agreement Version
                    </h1>
                    <p className="text-slate-600 mt-1">
                        This will become the current version. All active coaches
                        will be notified by email.
                    </p>
                </div>
            </div>

            {error && (
                <Alert variant="error">
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card className="p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Version Details
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Version Number"
                            placeholder="e.g., 2.0"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            required
                        />
                        <Input
                            label="Effective Date"
                            type="date"
                            value={effectiveDate}
                            onChange={(e) =>
                                setEffectiveDate(e.target.value)
                            }
                            required
                        />
                    </div>

                    <Input
                        label="Agreement Title"
                        placeholder="SwimBuddz Coach Agreement"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </Card>

                <Card className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Agreement Content
                        </h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(!showPreview)}
                        >
                            {showPreview ? (
                                <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Edit
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                </>
                            )}
                        </Button>
                    </div>

                    <p className="text-sm text-slate-500">
                        Write the agreement content in Markdown format. Use ##
                        for section headers and - for bullet points.
                    </p>

                    {showPreview ? (
                        <div
                            className="rounded-lg border border-slate-200 bg-white p-6 prose prose-slate max-w-none min-h-[400px]"
                            dangerouslySetInnerHTML={{
                                __html: content
                                    ? renderMarkdown(content)
                                    : '<p class="text-slate-400">Nothing to preview yet.</p>',
                            }}
                        />
                    ) : (
                        <textarea
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 min-h-[400px] resize-y"
                            placeholder="# SwimBuddz Coach Agreement&#10;&#10;## 1. Introduction&#10;&#10;This Agreement..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    )}

                    <p className="text-xs text-slate-400">
                        {content.length} characters
                        {content.length < 100 && content.length > 0
                            ? ` (minimum 100 required)`
                            : ""}
                    </p>
                </Card>

                <div className="flex items-center justify-between">
                    <Link
                        href="/admin/coaches/agreements"
                        className="text-sm text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </Link>
                    <Button type="submit" disabled={submitting}>
                        {submitting
                            ? "Creating..."
                            : "Create & Notify Coaches"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
