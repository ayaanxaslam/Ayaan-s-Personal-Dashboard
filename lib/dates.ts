// Date helpers built around local calendar days ("YYYY-MM-DD").
//
// Timezone strategy: every record stores the user's LOCAL calendar date.
// "Today" is computed in the IANA timezone saved in user_settings (falling
// back to UTC until the browser reports one). Arithmetic on day strings is
// done in UTC so it never drifts with daylight-saving changes.

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(tz: string | null | undefined): string {
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}

/** The local calendar date for `now` in `timeZone`. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Local date of an absolute timestamp in `timeZone`. */
export function dateInTimeZone(timestamp: string | Date, timeZone: string): string {
  return todayInTimeZone(timeZone, typeof timestamp === "string" ? new Date(timestamp) : timestamp);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Whole days from `a` to `b` (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(toUtc(date)).getUTCDay();
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

/** First day of the week containing `date`. weekStartsOn: 0 = Sunday, 1 = Monday. */
export function startOfWeek(date: string, weekStartsOn: 0 | 1): string {
  const offset = (weekday(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });
    fmtCache.set(key, f);
  }
  return f;
}

/** "Thursday, 16 October" */
export function formatLongDate(date: string): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(toUtc(date));
}

/** "16 Oct 2026" */
export function formatDate(date: string): string {
  return fmt({ day: "numeric", month: "short", year: "numeric" }).format(toUtc(date));
}

/** "16 Oct" */
export function formatShortDate(date: string): string {
  return fmt({ day: "numeric", month: "short" }).format(toUtc(date));
}

/** "Mon" */
export function formatWeekdayShort(date: string): string {
  return fmt({ weekday: "short" }).format(toUtc(date));
}

/** "M" */
export function formatWeekdayNarrow(date: string): string {
  return fmt({ weekday: "narrow" }).format(toUtc(date));
}

/** Friendly label relative to today: Today / Yesterday / Mon 13 Oct. */
export function formatRelativeDay(date: string, today: string): string {
  const d = diffDays(date, today);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(toUtc(date));
}

export function greetingFor(timeZone: string, now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
