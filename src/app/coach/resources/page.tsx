"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
    getMyCoachCohorts,
    getMyCoachResources,
    type Cohort,
    type CohortResource,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { BookOpen, Download, ExternalLink, FileText, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CoachResourcesPage() {
    const [resources, setResources] = useState<CohortResource[]>([]);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [selectedCohortId, setSelectedCohortId] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("all");

    useEffect(() => {
        async function loadData() {
            try {
                const [resourcesData, cohortsData] = await Promise.all([
                    getMyCoachResources(),
                    getMyCoachCohorts(),
                ]);
                setResources(resourcesData);
                setCohorts(cohortsData);
            } catch (err) {
                console.error("Failed to load resources", err);
                setError("Failed to load resources. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Get unique resource types
    const resourceTypes = useMemo(() => {
        const types = new Set(resources.map((r) => r.resource_type));
        return Array.from(types);
    }, [resources]);

    // Filter resources
    const filteredResources = useMemo(() => {
        return resources.filter((resource) => {
            const cohortMatch =
                selectedCohortId === "all" ||
                resource.cohort_id === selectedCohortId;
            const typeMatch =
                selectedType === "all" || resource.resource_type === selectedType;
            return cohortMatch && typeMatch;
        });
    }, [resources, selectedCohortId, selectedType]);

    // Group resources by cohort
    const resourcesByCohort = useMemo(() => {
        const grouped: Record<string, CohortResource[]> = {};

        filteredResources.forEach((resource) => {
            const cohortId = resource.cohort_id;
            if (!grouped[cohortId]) {
                grouped[cohortId] = [];
            }
            grouped[cohortId].push(resource);
        });

        return grouped;
    }, [filteredResources]);

    // Get cohort name by ID
    const getCohortName = (cohortId: string) => {
        const cohort = cohorts.find((c) => c.id === cohortId);
        return cohort?.name || cohort?.program?.name || "Unknown Cohort";
    };

    if (loading) {
        return <LoadingCard text="Loading resources..." />;
    }

    if (error) {
        return (
            <Alert variant="error" title="Error">
                {error}
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <h1 className="text-3xl font-bold text-slate-900">
                    Teaching Materials
                </h1>
                <p className="text-slate-600 mt-1">
                    Resources and materials for your cohorts.
                </p>
            </header>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1 sm:max-w-xs">
                        <Select
                            label="Cohort"
                            value={selectedCohortId}
                            onChange={(e) => setSelectedCohortId(e.target.value)}
                        >
                            <option value="all">All Cohorts</option>
                            {cohorts.map((cohort) => (
                                <option key={cohort.id} value={cohort.id}>
                                    {cohort.name || cohort.program?.name || "Unnamed"}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="sm:w-40">
                        <Select
                            label="Type"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            {resourceTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Content */}
            {resources.length === 0 ? (
                <Card className="p-6">
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <BookOpen className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium">No resources yet</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Resources will appear here once they are added to your cohorts.
                        </p>
                    </div>
                </Card>
            ) : filteredResources.length === 0 ? (
                <Card className="p-6">
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <BookOpen className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium">
                            No matching resources
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            Try adjusting your filters.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(resourcesByCohort).map(
                        ([cohortId, cohortResources]) => (
                            <div key={cohortId}>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {getCohortName(cohortId)}
                                    </h2>
                                    <Link
                                        href={`/coach/cohorts/${cohortId}`}
                                        className="text-sm text-cyan-700 hover:underline"
                                    >
                                        View Cohort
                                    </Link>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {cohortResources.map((resource) => (
                                        <ResourceCard
                                            key={resource.id}
                                            resource={resource}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

function ResourceCard({ resource }: { resource: CohortResource }) {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case "drill":
                return <Video className="h-5 w-5" />;
            case "note":
                return <FileText className="h-5 w-5" />;
            case "assignment":
                return <BookOpen className="h-5 w-5" />;
            default:
                return <FileText className="h-5 w-5" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "drill":
                return "bg-blue-100 text-blue-700";
            case "note":
                return "bg-amber-100 text-amber-700";
            case "assignment":
                return "bg-emerald-100 text-emerald-700";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return null;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Card className="p-4">
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(resource.resource_type)}`}>
                    {getTypeIcon(resource.resource_type)}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                        {resource.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default">
                            {resource.resource_type.charAt(0).toUpperCase() +
                                resource.resource_type.slice(1)}
                        </Badge>
                        {resource.week_number && (
                            <span className="text-xs text-slate-500">
                                Week {resource.week_number}
                            </span>
                        )}
                    </div>
                    {resource.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {resource.description}
                        </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-slate-500">
                            {formatDate(resource.created_at)}
                            {resource.file_size_bytes && (
                                <> · {formatFileSize(resource.file_size_bytes)}</>
                            )}
                        </span>
                        {resource.storage_path && (
                            <a
                                href={resource.storage_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-700 hover:text-cyan-800"
                            >
                                {resource.source_type === "url" ? (
                                    <ExternalLink className="h-4 w-4" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
