interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({
    size = "md",
    text,
    fullScreen = false
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-4",
        lg: "h-12 w-12 border-4",
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={`animate-spin rounded-full border-cyan-200 border-t-cyan-600 ${sizeClasses[size]}`} />
            {text && <p className="text-sm text-slate-500">{text}</p>}
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

export function LoadingPage({ text = "Loading..." }: { text?: string }) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
            <p className="text-lg font-medium text-slate-600">{text}</p>
        </div>
    );
}
