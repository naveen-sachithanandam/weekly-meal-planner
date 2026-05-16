import { startOfWeek } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";

import { HOME_TIMEZONE } from "./config";

export function getToday(): string {
  return format(toZonedTime(new Date(), HOME_TIMEZONE), "yyyy-MM-dd");
}

export function getWeekStart(offsetWeeks: number = 0): string {
  const now = toZonedTime(new Date(), HOME_TIMEZONE);
  const sunday = startOfWeek(now, { weekStartsOn: 0 });
  sunday.setDate(sunday.getDate() + offsetWeeks * 7);
  return format(sunday, "yyyy-MM-dd");
}

export function isPastDay(date: string): boolean {
  return date < getToday();
}
