import { Loader2 } from "lucide-react";

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
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-cyan-600`} />
            {text && <p className="text-sm text-slate-600">{text}</p>}
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

export function LoadingCard() {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner text="Loading..." />
            </div>
        </div>
    );
}

export function LoadingPage({ text = "Loading..." }: { text?: string }) {
    return (
        <div className="py-12 text-center">
            <LoadingSpinner size="lg" text={text} />
        </div>
    );
}
