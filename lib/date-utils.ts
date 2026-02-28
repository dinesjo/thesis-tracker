import { DEFAULT_TIMEZONE } from "@/lib/domain/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDateToUtc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function isoDateInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function formatShortDate(
  iso: string,
  timeZone: string = DEFAULT_TIMEZONE,
  locale: string = "en-SE",
): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

export function formatDateRange(
  startIso: string,
  endIso: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return `${formatShortDate(startIso, timeZone)} - ${formatShortDate(endIso, timeZone)}`;
}

export function daysUntilDate(
  iso: string,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const todayIso = isoDateInTimeZone(now, timeZone);
  return Math.ceil((parseIsoDateToUtc(iso) - parseIsoDateToUtc(todayIso)) / DAY_MS);
}

export function daysBetweenDates(startIso: string, endIso: string): number {
  return Math.round((parseIsoDateToUtc(endIso) - parseIsoDateToUtc(startIso)) / DAY_MS) + 1;
}

export function relativeDayLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days}d`;
}
