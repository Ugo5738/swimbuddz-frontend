"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { HandbookApi, type HandbookContent } from "@/lib/coaches";
import {
    ArrowLeft,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Download,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Generate a table of contents from markdown headings.
 */
function extractHeadings(content: string) {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const headings: { level: number; text: string; id: string }[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-");
        headings.push({ level, text, id });
    }

    return headings;
}

function stripInternalAppendix(content: string) {
    const appendixStart = content.search(/^##\s+Appendix B\b/m);
    if (appendixStart === -1) {
        return content;
    }
    return content.slice(0, appendixStart).trimEnd();
}

export default function CoachHandbookPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [handbook, setHandbook] = useState<HandbookContent | null>(null);
    const [tocOpen, setTocOpen] = useState(true);

    useEffect(() => {
        loadHandbook();
    }, []);

    async function loadHandbook() {
        try {
            setLoading(true);
            setError(null);
            const data = await HandbookApi.getCurrentHandbook();
            setHandbook(data);
        } catch (err) {
            console.error("Failed to load handbook", err);
            setError("Failed to load the Coach Handbook. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const visibleContent = useMemo(
        () => (handbook ? stripInternalAppendix(handbook.content) : ""),
        [handbook]
    );

    const headings = useMemo(
        () => (visibleContent ? extractHeadings(visibleContent) : []),
        [visibleContent]
    );

    if (loading) {
        return (
            <div className="space-y-4 p-4 md:p-6">
                <LoadingCard />
                <LoadingCard />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-6">
                <Alert variant="error">{error}</Alert>
                <Button onClick={loadHandbook} className="mt-4">
                    Retry
                </Button>
            </div>
        );
    }

    if (!handbook) {
        return (
            <div className="p-4 md:p-6">
                <Alert variant="info">
                    No handbook is currently available. Please check back later.
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/coach/dashboard">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Coach Handbook
                        </h1>
                        <p className="text-sm text-gray-500">
                            Version {handbook.version} &middot; Effective{" "}
                            {new Date(handbook.effective_date).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                    >
                        <Download className="mr-1 h-4 w-4" />
                        Print / PDF
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row">
                {/* Table of Contents (sidebar on desktop, collapsible on mobile) */}
                <div className="w-full lg:w-72 lg:flex-shrink-0">
                    <Card className="sticky top-4">
                        <button
                            onClick={() => setTocOpen(!tocOpen)}
                            className="flex w-full items-center justify-between p-4 lg:cursor-default"
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-emerald-600" />
                                <span className="font-semibold text-gray-900">
                                    Table of Contents
                                </span>
                            </div>
                            <span className="lg:hidden">
                                {tocOpen ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </span>
                        </button>
                        {tocOpen && (
                            <nav className="max-h-[60vh] overflow-y-auto border-t px-4 pb-4">
                                <ul className="space-y-1 pt-2">
                                    {headings.map((heading, i) => (
                                        <li
                                            key={i}
                                            style={{
                                                paddingLeft: `${(heading.level - 1) * 12}px`,
                                            }}
                                        >
                                            <a
                                                href={`#${heading.id}`}
                                                className="block rounded px-2 py-1 text-sm text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                            >
                                                {heading.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                    </Card>
                </div>

                {/* Handbook Content */}
                <Card className="min-w-0 flex-1 p-6 md:p-8">
                    <article className="markdown-content max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ children, ...props }) => {
                                    const text = String(children);
                                    const id = text
                                        .toLowerCase()
                                        .replace(/[^\w\s-]/g, "")
                                        .replace(/\s+/g, "-");
                                    return (
                                        <h1 id={id} {...props}>
                                            {children}
                                        </h1>
                                    );
                                },
                                h2: ({ children, ...props }) => {
                                    const text = String(children);
                                    const id = text
                                        .toLowerCase()
                                        .replace(/[^\w\s-]/g, "")
                                        .replace(/\s+/g, "-");
                                    return (
                                        <h2 id={id} {...props}>
                                            {children}
                                        </h2>
                                    );
                                },
                                h3: ({ children, ...props }) => {
                                    const text = String(children);
                                    const id = text
                                        .toLowerCase()
                                        .replace(/[^\w\s-]/g, "")
                                        .replace(/\s+/g, "-");
                                    return (
                                        <h3 id={id} {...props}>
                                            {children}
                                        </h3>
                                    );
                                },
                                table: ({ children, ...props }) => (
                                    <div className="my-6 overflow-x-auto">
                                        <table {...props}>{children}</table>
                                    </div>
                                ),
                            }}
                        >
                            {visibleContent}
                        </ReactMarkdown>
                    </article>
                </Card>
            </div>
        </div>
    );
}
