export const MS_IN_DAY = 24 * 60 * 60 * 1000;

const parseDateOnlyUtc = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};

const formatDateOnlyUtc = (date: Date) => date.toISOString().split("T")[0];

export const dateOnlyForTimezone = (iso: string, timezone: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(iso));
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall back to UTC date component.
  }
  return iso.split("T")[0];
};

export const dateShiftDays = (originalDateOnly: string, newDateOnly: string) =>
  Math.round(
    (parseDateOnlyUtc(newDateOnly).getTime() - parseDateOnlyUtc(originalDateOnly).getTime()) /
      MS_IN_DAY,
  );

export const shiftDateByDays = (dateOnly: string, days: number) => {
  const date = parseDateOnlyUtc(dateOnly);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnlyUtc(date);
};

export const shiftIsoByDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * MS_IN_DAY).toISOString();

export const sameInstant = (leftIso: string, rightIso: string) =>
  new Date(leftIso).getTime() === new Date(rightIso).getTime();
