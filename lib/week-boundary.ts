import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** IANA zone for all week math per SPEC.md (America/Toronto, Eastern with DST). */
const TORONTO = "America/Toronto";

/** Shifts a Gregorian calendar date by `deltaDays` using UTC date arithmetic so results stay consistent regardless of server TZ. */
function addDaysCalendar(
  year: number,
  month: number,
  day: number,
  deltaDays: number,
): { year: number; month: number; day: number } {
  const t = Date.UTC(year, month - 1, day + deltaDays);
  const shifted = new Date(t);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** ISO weekday (1 = Monday … 7 = Sunday) for a Toronto calendar date, using noon wall-clock to avoid midnight DST edges. */
function isoWeekdayTorontoCalendar(year: number, month: number, day: number): number {
  const wallNoon = new Date(year, month - 1, day, 12, 0, 0, 0);
  const instant = fromZonedTime(wallNoon, TORONTO);
  return Number(formatInTimeZone(instant, TORONTO, "i"));
}

/** Toronto Sunday 00:00:00 (week identity) for the Sun→Saturday week that contains `instant`, returned as a UTC `Date` instant. */
function sundayMidnightTorontoContaining(instant: Date): Date {
  const y = Number(formatInTimeZone(instant, TORONTO, "yyyy"));
  const m = Number(formatInTimeZone(instant, TORONTO, "MM"));
  const d = Number(formatInTimeZone(instant, TORONTO, "dd"));
  const isoDow = isoWeekdayTorontoCalendar(y, m, d);
  const daysSinceSunday = isoDow === 7 ? 0 : isoDow;
  const sun = addDaysCalendar(y, m, d, -daysSinceSunday);
  return fromZonedTime(new Date(sun.year, sun.month - 1, sun.day, 0, 0, 0, 0), TORONTO);
}

/** Returns this week’s Sunday at 00:00 America/Toronto as a UTC `Date` (the canonical week key used for “current week”). */
export function getCurrentWeekStart(now: Date = new Date()): Date {
  return sundayMidnightTorontoContaining(now);
}

/** Returns inclusive Toronto bounds for the week identified by `weekStart`: Sunday 00:00 through Saturday 23:59:59.999, each as UTC `Date` instants. */
export function getWeekBoundaries(weekStart: Date): { start: Date; end: Date } {
  const start = sundayMidnightTorontoContaining(weekStart);
  const y = Number(formatInTimeZone(start, TORONTO, "yyyy"));
  const mo = Number(formatInTimeZone(start, TORONTO, "MM"));
  const da = Number(formatInTimeZone(start, TORONTO, "dd"));
  const saturday = addDaysCalendar(y, mo, da, 6);
  const end = fromZonedTime(
    new Date(saturday.year, saturday.month - 1, saturday.day, 23, 59, 59, 999),
    TORONTO,
  );
  return { start, end };
}

/** Builds a short English title like “Week of June 8, 2025” from the Toronto Sunday that begins that plan week. */
export function formatWeekLabel(weekStart: Date): string {
  const sunday = sundayMidnightTorontoContaining(weekStart);
  const inner = formatInTimeZone(sunday, TORONTO, "MMMM d, yyyy");
  return `Week of ${inner}`;
}

/** True when `weekStart` is in the same Toronto Sun→Saturday week as the current instant (normalized Sunday midnights must match). */
export function isCurrentWeek(weekStart: Date): boolean {
  return (
    sundayMidnightTorontoContaining(weekStart).getTime() ===
    sundayMidnightTorontoContaining(new Date()).getTime()
  );
}

/**
 * Parses `YYYY-MM-DD` as Toronto midnight and returns that instant only when it falls on a Sunday (valid weekly plan key); otherwise `null`.
 */
export function parseWeekStartDateString(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const instant = fromZonedTime(new Date(y, mo - 1, da, 0, 0, 0, 0), TORONTO);
  const isoDow = Number(formatInTimeZone(instant, TORONTO, "i"));
  if (isoDow !== 7) return null;
  return instant;
}

/** Toronto `YYYY-MM-DD` for the Sunday that starts the same week as `weekStartSunday` (normalized midnight). */
export function formatWeekStartDateParam(weekStartSunday: Date): string {
  const start = sundayMidnightTorontoContaining(weekStartSunday);
  return formatInTimeZone(start, TORONTO, "yyyy-MM-dd");
}

/**
 * Shifts a valid Toronto Sunday key by `deltaDays` on the Toronto calendar (e.g. ±7 for adjacent weeks).
 * Returns the new Sunday `YYYY-MM-DD`, or `null` if the input is invalid or the shifted date is not a Toronto Sunday.
 */
export function shiftTorontoSundayByDays(isoSunday: string, deltaDays: number): string | null {
  const base = parseWeekStartDateString(isoSunday);
  if (!base) return null;
  const y = Number(formatInTimeZone(base, TORONTO, "yyyy"));
  const mo = Number(formatInTimeZone(base, TORONTO, "MM"));
  const d = Number(formatInTimeZone(base, TORONTO, "dd"));
  const shifted = addDaysCalendar(y, mo, d, deltaDays);
  const instant = fromZonedTime(
    new Date(shifted.year, shifted.month - 1, shifted.day, 0, 0, 0, 0),
    TORONTO,
  );
  const isoDow = Number(formatInTimeZone(instant, TORONTO, "i"));
  if (isoDow !== 7) return null;
  return formatInTimeZone(instant, TORONTO, "yyyy-MM-dd");
}

/**
 * True when `instant` is exactly Sunday 00:00:00 (Toronto wall clock), i.e. a normalized `weekStartSunday` DB key.
 */
export function isSundayMidnightToronto(instant: Date): boolean {
  const isoDow = Number(formatInTimeZone(instant, TORONTO, "i"));
  const clock = formatInTimeZone(instant, TORONTO, "HH:mm:ss");
  return isoDow === 7 && clock === "00:00:00";
}
