"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
    AdminAgreementApi,
    type AgreementVersionListItem,
} from "@/lib/coaches";
import { formatDate } from "@/lib/format";
import { FileSignature, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminAgreementsPage() {
    const pathname = usePathname();
    const [versions, setVersions] = useState<AgreementVersionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadVersions();
    }, []);

    const loadVersions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await AdminAgreementApi.list();
            setVersions(data);
        } catch (err) {
            console.error("Failed to load agreement versions:", err);
            setError("Failed to load agreement versions. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Coach Management
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Manage agreement versions and coach applications
                    </p>
                </div>
                <Link href="/admin/coaches/agreements/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Version
                    </Button>
                </Link>
            </div>

            {/* Sub-navigation tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <Link
                    href="/admin/coaches"
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                        pathname === "/admin/coaches"
                            ? "border-cyan-600 text-cyan-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                    Applications
                </Link>
                <Link
                    href="/admin/coaches/agreements"
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                        pathname?.startsWith("/admin/coaches/agreements")
                            ? "border-cyan-600 text-cyan-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                    Agreements
                </Link>
            </div>

            {loading ? (
                <LoadingCard text="Loading agreement versions..." />
            ) : error ? (
                <Card className="p-8 text-center">
                    <p className="text-rose-600">{error}</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={loadVersions}
                    >
                        Retry
                    </Button>
                </Card>
            ) : versions.length === 0 ? (
                <Card className="p-8 text-center">
                    <FileSignature className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                        No agreement versions found.
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                        Create the first version to get started.
                    </p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Version
                                    </th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Title
                                    </th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Effective Date
                                    </th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Status
                                    </th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Signatures
                                    </th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Created
                                    </th>
                                    <th className="text-left px-6 py-3 font-medium text-slate-600">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {versions.map((v) => (
                                    <tr
                                        key={v.id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                            v{v.version}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700">
                                            {v.title}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatDate(v.effective_date)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge
                                                variant={
                                                    v.is_current
                                                        ? "success"
                                                        : "default"
                                                }
                                            >
                                                {v.is_current
                                                    ? "Current"
                                                    : "Archived"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {v.signature_count}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {formatDate(v.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/coaches/agreements/${v.id}`}
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    View
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
