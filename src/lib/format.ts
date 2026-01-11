/**
 * Format a number as Nigerian Naira currency
 * @param amount - The amount to format
 * @param options - Formatting options
 */
export function formatNaira(
    amount: number,
    options: {
        showDecimal?: boolean;
        showSymbol?: boolean;
    } = {}
): string {
    const { showDecimal = true, showSymbol = true } = options;

    const formatted = new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: showDecimal ? 2 : 0,
        maximumFractionDigits: showDecimal ? 2 : 0,
    }).format(amount);

    return showSymbol ? `₦${formatted}` : formatted;
}

/**
 * Format a date in a human-readable format
 * @param date - Date string or Date object
 * @param options - Formatting options
 */
export function formatDate(
    date: string | Date,
    options: {
        includeTime?: boolean;
        includeYear?: boolean;
        format?: "short" | "long";
    } = {}
): string {
    const { includeTime = false, includeYear = true, format = "short" } = options;
    const d = typeof date === "string" ? new Date(date) : date;

    const dateOptions: Intl.DateTimeFormatOptions = {
        month: format === "short" ? "short" : "long",
        day: "numeric",
        ...(includeYear && { year: "numeric" }),
    };

    if (includeTime) {
        dateOptions.hour = "numeric";
        dateOptions.minute = "2-digit";
    }

    return d.toLocaleDateString("en-US", dateOptions);
}

/**
 * Format a time in a human-readable format
 * @param date - Date string or Date object
 */
export function formatTime(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours")
 * @param date - Date string or Date object
 */
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffDays) >= 1) {
        return rtf.format(diffDays, "day");
    } else if (Math.abs(diffHours) >= 1) {
        return rtf.format(diffHours, "hour");
    } else {
        return rtf.format(diffMinutes, "minute");
    }
}
