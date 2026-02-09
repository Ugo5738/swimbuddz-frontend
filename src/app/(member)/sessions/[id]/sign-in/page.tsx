"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Legacy sign-in page - redirects to the new /book page.
 * Kept for backwards compatibility with existing bookmarks and links.
 */
export default function SessionSignInRedirectPage({ params }: { params: { id: string } }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Preserve any query params (like payment reference)
        const queryString = searchParams.toString();
        const newUrl = `/sessions/${params.id}/book${queryString ? `?${queryString}` : ""}`;
        window.location.replace(newUrl);
    }, [params.id, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-slate-500">Redirecting...</p>
        </div>
    );
}
