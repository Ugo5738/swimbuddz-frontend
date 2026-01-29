interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    fullScreen?: boolean;
}

/**
 * Standardized loading spinner component for SwimBuddz.
 * Uses an elegant partial arc spinner (cyan gradient) with optional text label.
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
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    const textClasses = {
        sm: "text-xs text-slate-500",
        md: "text-sm text-slate-600",
        lg: "text-lg font-medium text-slate-600",
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
            <svg
                className={`animate-spin ${sizeClasses[size]}`}
                viewBox="0 0 50 50"
                aria-hidden="true"
            >
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="text-cyan-600"
                    strokeDasharray="80, 200"
                    strokeDashoffset="0"
                />
            </svg>
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
 */
export function LoadingPage({ text = "Loading..." }: { text?: string }) {
    return (
        <div
            className="flex min-h-[400px] flex-col items-center justify-center gap-4"
            role="status"
            aria-live="polite"
        >
            <svg
                className="h-12 w-12 animate-spin"
                viewBox="0 0 50 50"
                aria-hidden="true"
            >
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="text-cyan-600"
                    strokeDasharray="80, 200"
                    strokeDashoffset="0"
                />
            </svg>
            <p className="text-lg font-medium text-slate-600">{text}</p>
        </div>
    );
}
