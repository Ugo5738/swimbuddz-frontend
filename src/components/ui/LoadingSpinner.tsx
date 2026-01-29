interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    fullScreen?: boolean;
}

/**
 * Standardized loading spinner component for SwimBuddz.
 * Uses a cyan-colored border spinner with optional text label.
 *
 * Sizes:
 * - sm: 16px (for inline/button loading)
 * - md: 32px (for card/section loading)
 * - lg: 48px (for page loading)
 */
export function LoadingSpinner({
    size = "md",
    text,
    fullScreen = false
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-[3px]",
        lg: "h-12 w-12 border-4",
    };

    const textClasses = {
        sm: "text-xs text-slate-500",
        md: "text-sm text-slate-600",
        lg: "text-lg font-medium text-slate-600",
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
            <div
                className={`animate-spin rounded-full border-cyan-200 border-t-cyan-600 ${sizeClasses[size]}`}
                aria-hidden="true"
            />
            {text && <p className={textClasses[size]}>{text}</p>}
            {!text && <span className="sr-only">Loading...</span>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                {spinner}
            </div>
        );
    }

    return spinner;
}

/**
 * LoadingPage - Displays a centered loading spinner for full-page loading states.
 * Use this when the entire page content is loading.
 * Matches the standard SwimBuddz loader style shown across the platform.
 */
export function LoadingPage({ text = "Loading..." }: { text?: string }) {
    return (
        <div
            className="flex min-h-[400px] flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
        >
            <div
                className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"
                aria-hidden="true"
            />
            <p className="text-lg font-medium text-slate-600">{text}</p>
        </div>
    );
}
