/**
 * Tests for format utility functions.
 *
 * These are pure functions with zero dependencies — ideal for comprehensive
 * unit testing covering edge cases, locales, and option permutations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate, formatNaira, formatRelativeTime, formatTime } from '../format';

// ---------------------------------------------------------------------------
// formatNaira
// ---------------------------------------------------------------------------

describe('formatNaira', () => {
    it('formats a round amount with symbol and decimals by default', () => {
        const result = formatNaira(1000);
        expect(result).toContain('₦');
        expect(result).toContain('1,000');
        expect(result).toMatch(/\.00$/);
    });

    it('formats zero correctly', () => {
        const result = formatNaira(0);
        expect(result).toBe('₦0.00');
    });

    it('formats large amounts with comma separators', () => {
        const result = formatNaira(1500000);
        expect(result).toContain('1,500,000');
    });

    it('formats decimal amounts', () => {
        const result = formatNaira(99.5);
        expect(result).toContain('99.50');
    });

    it('hides decimal when showDecimal is false', () => {
        const result = formatNaira(1000, { showDecimal: false });
        expect(result).not.toContain('.');
        expect(result).toContain('₦');
    });

    it('hides symbol when showSymbol is false', () => {
        const result = formatNaira(1000, { showSymbol: false });
        expect(result).not.toContain('₦');
        expect(result).toContain('1,000');
    });

    it('hides both decimal and symbol', () => {
        const result = formatNaira(2500, { showDecimal: false, showSymbol: false });
        expect(result).not.toContain('₦');
        expect(result).not.toContain('.');
        expect(result).toContain('2,500');
    });

    it('handles negative amounts', () => {
        const result = formatNaira(-5000);
        expect(result).toContain('5,000');
    });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
    // Use a fixed date to avoid locale/timezone flakiness
    const testDate = new Date('2025-06-15T14:30:00Z');
    const testDateString = '2025-06-15T14:30:00Z';

    it('formats a Date object in short format with year by default', () => {
        const result = formatDate(testDate);
        // Should contain month (short), day, and year
        expect(result).toMatch(/Jun/);
        expect(result).toMatch(/15/);
        expect(result).toMatch(/2025/);
    });

    it('formats a date string the same as a Date object', () => {
        const fromString = formatDate(testDateString);
        const fromDate = formatDate(testDate);
        expect(fromString).toBe(fromDate);
    });

    it('uses long month format when format is "long"', () => {
        const result = formatDate(testDate, { format: 'long' });
        expect(result).toMatch(/June/);
    });

    it('excludes year when includeYear is false', () => {
        const result = formatDate(testDate, { includeYear: false });
        expect(result).not.toMatch(/2025/);
        expect(result).toMatch(/Jun/);
    });

    it('includes time when includeTime is true', () => {
        const result = formatDate(testDate, { includeTime: true });
        // Should contain some time component (hour:minute or AM/PM)
        expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('combines all options', () => {
        const result = formatDate(testDate, {
            format: 'long',
            includeYear: true,
            includeTime: true,
        });
        expect(result).toMatch(/June/);
        expect(result).toMatch(/2025/);
        expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe('formatTime', () => {
    it('formats a Date object to time string', () => {
        // 2:30 PM UTC — actual output depends on test env timezone
        const date = new Date('2025-06-15T14:30:00Z');
        const result = formatTime(date);
        // Should match pattern like "2:30 PM" or "10:30 PM" etc.
        expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('formats a date string to time string', () => {
        const result = formatTime('2025-06-15T09:00:00Z');
        expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('handles midnight', () => {
        const result = formatTime(new Date('2025-06-15T00:00:00Z'));
        expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe('formatRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "yesterday" for 1 day ago', () => {
        const result = formatRelativeTime('2025-06-14T12:00:00Z');
        expect(result).toBe('yesterday');
    });

    it('returns "tomorrow" for 1 day ahead', () => {
        const result = formatRelativeTime('2025-06-16T12:00:00Z');
        expect(result).toBe('tomorrow');
    });

    it('returns day-based relative time for multi-day differences', () => {
        const result = formatRelativeTime('2025-06-12T12:00:00Z');
        expect(result).toMatch(/3 days ago/);
    });

    it('returns future day-based relative time', () => {
        const result = formatRelativeTime('2025-06-18T12:00:00Z');
        expect(result).toMatch(/in 3 days/);
    });

    it('returns hour-based relative time for <24h differences', () => {
        const result = formatRelativeTime('2025-06-15T09:00:00Z');
        expect(result).toMatch(/3 hours ago/);
    });

    it('returns future hour-based relative time', () => {
        const result = formatRelativeTime('2025-06-15T15:00:00Z');
        expect(result).toMatch(/in 3 hours/);
    });

    it('returns minute-based relative time for <1h differences', () => {
        const result = formatRelativeTime('2025-06-15T11:45:00Z');
        expect(result).toMatch(/15 minutes ago/);
    });

    it('handles "just now" or 0 minutes', () => {
        const result = formatRelativeTime('2025-06-15T12:00:00Z');
        // Intl.RelativeTimeFormat with numeric: "auto" returns "this minute" or "0 minutes ago"
        expect(result).toBeTruthy();
    });

    it('accepts Date objects as input', () => {
        const date = new Date('2025-06-14T12:00:00Z');
        const result = formatRelativeTime(date);
        expect(result).toBe('yesterday');
    });
});
