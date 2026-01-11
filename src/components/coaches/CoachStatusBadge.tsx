import { Badge } from "@/components/ui/Badge";

export type CoachStatus =
    | "none"
    | "pending_review"
    | "more_info_needed"
    | "approved"
    | "active"
    | "rejected"
    | "suspended";

const statusConfig: Record<CoachStatus, { label: string; variant: "default" | "warning" | "success" | "info" | "danger" }> = {
    none: { label: "Not Applied", variant: "default" },
    pending_review: { label: "Pending Review", variant: "warning" },
    more_info_needed: { label: "More Info Needed", variant: "info" },
    approved: { label: "Approved", variant: "success" },
    active: { label: "Active", variant: "success" },
    rejected: { label: "Rejected", variant: "danger" },
    suspended: { label: "Suspended", variant: "danger" },
};

interface CoachStatusBadgeProps {
    status: CoachStatus | string;
    className?: string;
}

export function CoachStatusBadge({ status, className }: CoachStatusBadgeProps) {
    const config = statusConfig[status as CoachStatus] || { label: status, variant: "default" as const };

    return (
        <Badge variant={config.variant} className={className}>
            {config.label}
        </Badge>
    );
}

// Helper functions for backward compatibility
export function getStatusLabel(status: string): string {
    return statusConfig[status as CoachStatus]?.label || status;
}

export function getStatusVariant(status: string): "default" | "warning" | "success" | "info" | "danger" {
    return statusConfig[status as CoachStatus]?.variant || "default";
}
